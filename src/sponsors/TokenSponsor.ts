import { Address, concat, encodeAbiParameters } from "viem"
import { Sponsor } from "./Sponsor"
import { AllTokenData, PaymasterType } from "./types"
import { addTransaction, batchOperation, updatePaymasterMode } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { TOKEN_SPONSOR_SUPPORT_CHAINS, TransactionParams } from "../common"
import { AddressZero, TOKEN_PAYMASTER_CONTRACT_INTERFACE } from "../common/constants"
import { EnvOption } from "../config"
import { Chain, Operation, Token } from "../data"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getPermitHash, getWalletPermitNonce } from "../utils"

export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
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
    }

    async getFunSponsorAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        if (!this.sponsorAddress) {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            if (TOKEN_SPONSOR_SUPPORT_CHAINS.includes(await chain.getChainId())) {
                this.sponsorAddress = await chain.getAddress("funTokenSponsorAddress")
            } else {
                throw new ResourceNotFoundError(
                    ErrorCode.MissingParameter,
                    "The network you are working with does not support token Fun Sponsor. You will need to run and manage your own token sponsor.",
                    { tokenSponsorSupportChains: TOKEN_SPONSOR_SUPPORT_CHAINS, chain: await chain.getChainId() },
                    "Manage your own token sponsor, or use a supported network",
                    "https://docs.fun.xyz"
                )
            }
        }
        return this.sponsorAddress
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const tokenAddress = await Token.getAddress(this.token, options)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const sponsor = await this.getFunSponsorAddress(options)
        return concat([paymasterAddress, sponsor, tokenAddress])
    }

    async getPaymasterAndDataPermit(
        partialOp: Operation,
        walletAddr: Address,
        userId: string,
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<string> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const { maxFeePerGas } = partialOp.userOp
        const estimateGasSignature = await auth.getEstimateGasSignature(userId, partialOp)
        partialOp.userOp.signature = estimateGasSignature.toLowerCase()
        const { callGasLimit, verificationGasLimit, preVerificationGas } = await chain.estimateOpGas(partialOp.userOp)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const requiredGas = (callGasLimit + (verificationGasLimit + 300_000n) * 3n + preVerificationGas) * maxFeePerGas * 25n
        const decAmount = await TOKEN_PAYMASTER_CONTRACT_INTERFACE.readFromChain(
            paymasterAddress,
            "getTokenValueOfEth",
            [this.token, requiredGas],
            chain
        )

        const tokenAddress = await Token.getAddress(this.token, options)
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

    async stake(
        depositor: Address,
        sponsor: Address,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const amountdec = await Token.getDecimalAmount("eth", amount, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await addTransaction(
            await chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "stake",
                amount,
                from: depositor,
                to: await this.getPaymasterAddress(options),
                token: "eth"
            },
            this.paymasterType,
            sponsor
        )

        return this.contractInterface.encodeTransactionParams(
            await this.getPaymasterAddress(),
            "addEthDepositTo",
            [sponsor, amountdec],
            BigInt(amountdec)
        )
    }

    async unstake(
        sponsor: Address,
        receiver: Address,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const amountdec = await Token.getDecimalAmount("eth", amount, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await addTransaction(
            await chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "unstake",
                amount,
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token: "eth"
            },
            this.paymasterType,
            receiver
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawEthDepositTo", [
            receiver,
            amountdec
        ])
    }

    async getUnlockBlock(sponsor: Address, token: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const tokenAddr = (await Token.isNative(token)) ? AddressZero : await Token.getAddress(token, options)
        return (await this.getAllTokenData(tokenAddr, sponsor, options)).unlockBlock
    }

    // false means unlocked, true means locked
    async getLockState(sponsor: Address, token: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const tokenAddr = (await Token.isNative(token)) ? AddressZero : await Token.getAddress(token, options)
        const unlockBlock = await this.getUnlockBlock(tokenAddr, sponsor)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const provider = await chain.getClient()
        const currentBlock = await provider.getBlockNumber()
        return unlockBlock === 0n || unlockBlock > currentBlock
    }

    async getTokenInfo(token: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const tokenAddress = await Token.getAddress(token, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getToken", [tokenAddress], chain)
    }

    async getAllTokenData(
        spender: Address,
        token: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<AllTokenData> {
        const tokenAddress = await Token.getAddress(token, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })

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

    async getTokenBalance(spender: Address, token: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigInt> {
        const tokenData = new Token(token)
        let tokenAddress
        if (tokenData.isNative) {
            tokenAddress = AddressZero
        } else {
            tokenAddress = await tokenData.getAddress(options)
        }

        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBalance",
            [tokenAddress, spender],
            chain
        )
    }

    async getAllTokens(options: EnvOption = (globalThis as any).globalEnvOption) {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getAllTokens", [], chain)
    }

    async addUsableToken(
        oracle: string,
        token: string,
        aggregator: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const decimals = await Token.getDecimals(token, options)
        const tokenAddress = await Token.getAddress(token, options)
        const data = [oracle, tokenAddress, decimals, aggregator]
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenData", [data])
    }

    async depositToken(
        depositor: Address,
        token: string,
        spender: Address,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const tokenObj = new Token(token)
        const tokenAddress = await tokenObj.getAddress(options)
        const amountdec = await tokenObj.getDecimalAmount(amount, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        addTransaction(
            await chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "stakeToken",
                amount,
                from: depositor,
                to: await this.getPaymasterAddress(options),
                token
            },
            this.paymasterType,
            spender
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "addTokenDepositTo", [
            tokenAddress,
            spender,
            amountdec
        ])
    }

    async withdrawToken(
        withdrawer: Address,
        token: string,
        receiver: Address,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const tokenObj = new Token(token)

        const tokenAddress = await tokenObj.getAddress(options)
        const amountdec = await tokenObj.getDecimalAmount(amount, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })

        addTransaction(
            await chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "unstakeToken",
                amount,
                from: withdrawer,
                to: await this.getPaymasterAddress(options),
                token
            },
            this.paymasterType,
            receiver
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawTokenDepositTo", [
            tokenAddress,
            receiver,
            amountdec
        ])
    }

    async lockTokenDeposit(token: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const tokenData = new Token(token)
        const tokenAddress = tokenData.isNative ? AddressZero : await tokenData.getAddress(options)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "lockTokenDeposit", [tokenAddress])
    }

    async unlockTokenDepositAfter(
        token: string,
        blocksToWait: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const tokenData = new Token(token)
        const tokenAddress = tokenData.isNative ? AddressZero : await tokenData.getAddress(options)
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

    async approve(
        approver: Address,
        token: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const gasSponsorAddress = await this.getPaymasterAddress()
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        addTransaction(
            await chain.getChainId(),
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
        return Token.approve(token, gasSponsorAddress, amount)
    }

    async getSpenderBlacklisted(
        spender: Address,
        sponsor: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderBlacklisted",
            [spender, sponsor],
            chain
        )
    }

    async getSpenderWhitelisted(
        spender: Address,
        sponsor: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderWhitelisted",
            [spender, sponsor],
            chain
        )
    }

    async getTokenWhitelisted(sponsor: Address, token: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const tokenAddress = await Token.getAddress(token, options)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenWhitelisted",
            [tokenAddress, sponsor],
            chain
        )
    }

    async setTokenToWhitelistMode(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await updatePaymasterMode(await chain.getChainId(), { tokenMode: "whitelist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenListMode", [false])
    }

    async batchWhitelistTokens(
        sponsor: Address,
        tokens: string[],
        modes: boolean[],
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const calldata: string[] = []
        for (let i = 0; i < tokens.length; i++) {
            const tokenAddress = await Token.getAddress(tokens[i], options)
            calldata.push(this.contractInterface.encodeData("setTokenWhitelistMode", [tokenAddress, modes[i]]))
        }
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await batchOperation(await chain.getChainId(), tokens, modes, "tokensWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "batchActions", [calldata])
    }

    async getTokenListMode(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption) {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getTokenListMode", [sponsor], chain)
    }

    async getTokenBlacklisted(sponsor: Address, token: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const tokenAddress = await Token.getAddress(token, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBlacklisted",
            [tokenAddress, sponsor],
            chain
        )
    }

    async setTokenToBlacklistMode(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await updatePaymasterMode(await chain.getChainId(), { tokenMode: "blacklist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenListMode", [true])
    }

    async batchBlacklistTokens(
        sponsor: Address,
        tokens: string[],
        modes: boolean[],
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const calldata: TransactionParams[] = []
        for (let i = 0; i < tokens.length; i++) {
            const tokenAddress = await Token.getAddress(tokens[i], options)
            calldata.push(
                this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setTokenBlacklistMode", [
                    tokenAddress,
                    modes[i]
                ])
            )
        }
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await batchOperation(await chain.getChainId(), tokens, modes, "tokensBlackList", this.paymasterType, sponsor)
        return this.batchTransaction(calldata)
    }

    static async getPaymasterAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await chain.getAddress(this.name)
    }
}
