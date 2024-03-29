import { Address, concat, encodeAbiParameters } from "viem"
import { Sponsor } from "./Sponsor"
import { AllTokenData, PaymasterType } from "./types"
import { addTransaction } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { TOKEN_SPONSOR_SUPPORT_CHAINS, TransactionParams } from "../common"
import { AddressZero, TOKEN_PAYMASTER_CONTRACT_INTERFACE } from "../common/constants"
import { GlobalEnvOption } from "../config"
import { Chain, Operation, Token } from "../data"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getPermitHash, getWalletPermitNonce } from "../utils"

export class TokenSponsor extends Sponsor {
    token: string
    override options: GlobalEnvOption

    constructor(options: GlobalEnvOption) {
        super(options, TOKEN_PAYMASTER_CONTRACT_INTERFACE, "tokenPaymasterAddress", PaymasterType.TokenSponsor)
        if (!options.gasSponsor?.token) {
            throw new InvalidParameterError(
                ErrorCode.MissingParameter,
                "token field is missing",
                { gasSponsor: options.gasSponsor },
                "Provide correct token name or address.",
                "https://docs.fun.xyz"
            )
        }
        this.token = options.gasSponsor!.token!.toLowerCase()
        this.options = options
    }

    async getFunSponsorAddress(options: GlobalEnvOption = this.options): Promise<Address> {
        if (!this.sponsorAddress) {
            const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
            if (TOKEN_SPONSOR_SUPPORT_CHAINS.includes(chain.getChainId())) {
                this.sponsorAddress = chain.getAddress("funTokenSponsorAddress")
            } else {
                throw new ResourceNotFoundError(
                    ErrorCode.MissingParameter,
                    "The network you are working with does not support token Fun Sponsor. You will need to run and manage your own token sponsor.",
                    { tokenSponsorSupportChains: TOKEN_SPONSOR_SUPPORT_CHAINS, chain: chain.getChainId() },
                    "Manage your own token sponsor, or use a supported network",
                    "https://docs.fun.xyz"
                )
            }
        }
        return this.sponsorAddress
    }

    async getPaymasterAndData(options: GlobalEnvOption = this.options): Promise<string> {
        // TODO: temporary fallback, remove after refactoring -- Panda
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddress = await Token.getAddress(this.token, chain, options.apiKey)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const sponsor = await this.getFunSponsorAddress(options)
        return concat([paymasterAddress, sponsor, tokenAddress])
    }

    async getPaymasterAndDataPermit(
        partialOp: Operation,
        walletAddr: Address,
        userId: string,
        auth: Auth,
        options: GlobalEnvOption = this.options
    ): Promise<string> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const estimateGasSignature = await auth.getEstimateGasSignature(userId, partialOp)
        partialOp.userOp.signature = estimateGasSignature.toLowerCase()
        const estimationPaymasterAddress = chain.getAddress("estimationPaymasterAddress")
        const { callGasLimit, verificationGasLimit, preVerificationGas } = await chain.estimateOpGas({
            ...partialOp.userOp,
            paymasterAndData: estimationPaymasterAddress
        })
        const { maxFeePerGas } = await chain.getFeeData()
        const paymasterAddress = await this.getPaymasterAddress(options)
        const requiredGas = (callGasLimit + (verificationGasLimit + 400_000n) * 3n + preVerificationGas) * BigInt(maxFeePerGas)
        const tokenAddress = await Token.getAddress(this.token, chain, options.apiKey)
        const decAmount = await TOKEN_PAYMASTER_CONTRACT_INTERFACE.readFromChain(
            paymasterAddress,
            "getTokenValueOfEth",
            [tokenAddress, requiredGas],
            chain
        )
        const nonce = await getWalletPermitNonce(walletAddr, chain)
        const client = await chain.getClient()
        const chainId = await client.getChainId()
        const hash = await getPermitHash(tokenAddress, paymasterAddress, decAmount, nonce, walletAddr, BigInt(chainId))
        const sig = await auth.signHash(hash)
        const encodedSig = encodeAbiParameters(
            [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes" }],
            [tokenAddress, paymasterAddress, decAmount, nonce, sig]
        )
        const sponsor = await this.getFunSponsorAddress(options)
        const encodedAddresses = encodeAbiParameters([{ type: "address" }, { type: "address" }], [sponsor, tokenAddress])
        const encodedData = encodeAbiParameters([{ type: "bytes" }, { type: "bytes" }], [encodedAddresses, encodedSig])
        return concat([paymasterAddress, encodedData])
    }

    async stake(sponsor: Address, amount: number, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const amountdec = await Token.getDecimalAmount("eth", amount, chain, options.apiKey)
        return this.contractInterface.encodeTransactionParams(
            await this.getPaymasterAddress(),
            "addEthDepositTo",
            [sponsor, amountdec],
            BigInt(amountdec)
        )
    }

    async unstake(receiver: Address, amount: number, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const amountdec = await Token.getDecimalAmount("eth", amount, chain, options.apiKey)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawEthDepositTo", [
            receiver,
            amountdec
        ])
    }

    async getUnlockBlock(sponsor: Address, token: string, options: GlobalEnvOption = this.options): Promise<bigint> {
        // TODO: temporary fallback, remove after refactoring -- Panda
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddr = (await Token.isNative(token)) ? AddressZero : await Token.getAddress(token, chain, options.apiKey)
        return (await this.getAllTokenData(tokenAddr, sponsor, options)).unlockBlock
    }

    // false means unlocked, true means locked
    async getLockState(sponsor: Address, token: string, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddr = Token.isNative(token) ? AddressZero : await Token.getAddress(token, chain, options.apiKey)
        const unlockBlock = await this.getUnlockBlock(tokenAddr, sponsor)
        const provider = await chain.getClient()
        const currentBlock = await provider.getBlockNumber()
        return unlockBlock === 0n || unlockBlock > currentBlock
    }

    async getTokenInfo(token: string, options: GlobalEnvOption = this.options) {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddress = await Token.getAddress(token, chain, options.apiKey)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getToken", [tokenAddress], chain)
    }

    async getAllTokenData(spender: Address, token: string, options: GlobalEnvOption = this.options): Promise<AllTokenData> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddress = await Token.getAddress(token, chain, options.apiKey)

        const data = await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getAllTokenData",
            [tokenAddress, spender],
            chain
        )
        return {
            unlockBlock: data[0],
            tokenAmount: data[1]
        }
    }

    async getTokenBalance(spender: Address, token: string, options: GlobalEnvOption = this.options): Promise<bigint> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)

        const tokenData = new Token(token, chain, "0x", options.apiKey)
        let tokenAddress
        if (tokenData.isNative) {
            tokenAddress = AddressZero
        } else {
            tokenAddress = await tokenData.getAddress()
        }

        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBalance",
            [tokenAddress, spender],
            chain
        )
    }

    async getAllTokens(options: GlobalEnvOption = this.options) {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getAllTokens", [], chain)
    }

    async addUsableToken(
        oracle: string,
        token: string,
        aggregator: string,
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const decimals = await Token.getDecimals(token, chain, options.apiKey)
        const tokenAddress = await Token.getAddress(token, chain, options.apiKey)
        const data = [oracle, tokenAddress, decimals, aggregator]
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenData", [data])
    }

    async depositToken(
        token: string,
        spender: Address,
        amount: number,
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenObj = new Token(token, chain, "0x", options.apiKey)
        const tokenAddress = await tokenObj.getAddress()
        const amountDec = await tokenObj.getDecimalAmount(amount)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "addTokenDepositTo", [
            tokenAddress,
            spender,
            amountDec
        ])
    }

    async withdrawToken(
        token: string,
        receiver: Address,
        amount: number,
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenObj = new Token(token, chain, "0x", options.apiKey)
        const tokenAddress = await tokenObj.getAddress()
        const amountdec = await tokenObj.getDecimalAmount(amount)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawTokenDepositTo", [
            tokenAddress,
            receiver,
            amountdec
        ])
    }

    async lockTokenDeposit(token: string, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenData = new Token(token, chain, "0x", options.apiKey)
        const tokenAddress = tokenData.isNative ? AddressZero : await tokenData.getAddress()
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "lockTokenDeposit", [tokenAddress])
    }

    async unlockTokenDepositAfter(
        token: string,
        blocksToWait: number,
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenData = new Token(token, chain, "0x", options.apiKey)
        const tokenAddress = tokenData.isNative ? AddressZero : await tokenData.getAddress()
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "unlockTokenDepositAfter", [
            tokenAddress,
            blocksToWait
        ])
    }

    async lockDeposit(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "lockTokenDeposit", [AddressZero])
    }

    async unlockDepositAfter(blocksToWait: number): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "unlockTokenDepositAfter", [
            AddressZero,
            blocksToWait
        ])
    }

    async approve(approver: Address, token: string, amount: number, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const gasSponsorAddress = await this.getPaymasterAddress()
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        addTransaction(
            chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "approve",
                amount,
                from: approver,
                to: await this.getPaymasterAddress(options),
                token
            },
            this.paymasterType,
            approver
        )
        return Token.approve(token, gasSponsorAddress, amount, chain, options.apiKey)
    }

    async getSpenderBlacklisted(spender: Address, sponsor: Address, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderBlacklisted",
            [spender, sponsor],
            chain
        )
    }

    async getSpenderWhitelisted(spender: Address, sponsor: Address, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderWhitelisted",
            [spender, sponsor],
            chain
        )
    }

    async getTokenWhitelisted(sponsor: Address, token: string, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddress = await Token.getAddress(token, chain, options.apiKey)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenWhitelisted",
            [tokenAddress, sponsor],
            chain
        )
    }

    async setTokenToWhitelistMode(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenListMode", [false])
    }

    async batchWhitelistTokens(tokens: string[], modes: boolean[], options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)

        const calldata: string[] = []
        for (let i = 0; i < tokens.length; i++) {
            const tokenAddress = await Token.getAddress(tokens[i], chain, options.apiKey)
            calldata.push(this.contractInterface.encodeData("setTokenWhitelistMode", [tokenAddress, modes[i]]))
        }
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "batchActions", [calldata])
    }

    async getTokenListMode(sponsor: Address, options: GlobalEnvOption = this.options) {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getTokenListMode", [sponsor], chain)
    }

    async getTokenBlacklisted(sponsor: Address, token: string, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const tokenAddress = await Token.getAddress(token, chain, options.apiKey)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBlacklisted",
            [tokenAddress, sponsor],
            chain
        )
    }

    async setTokenToBlacklistMode(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenListMode", [true])
    }

    async batchBlacklistTokens(tokens: string[], modes: boolean[], options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const calldata: TransactionParams[] = []
        for (let i = 0; i < tokens.length; i++) {
            const tokenAddress = await Token.getAddress(tokens[i], chain, options.apiKey)
            calldata.push(
                this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenBlacklistMode", [
                    tokenAddress,
                    modes[i]
                ])
            )
        }
        return this.batchTransaction(calldata)
    }

    static async getPaymasterAddress(chainId: string, apiKey: string): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: chainId }, apiKey)
        return chain.getAddress(this.name)
    }
}
