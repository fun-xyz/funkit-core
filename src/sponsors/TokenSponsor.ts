import { Address, concat, encodeAbiParameters } from "viem"
import { Sponsor } from "./Sponsor"
import { AllTokenData, PaymasterType } from "./types"
import { addTransaction, batchOperation, updatePaymasterMode } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { TOKEN_SPONSOR_SUPPORT_CHAINS, TransactionParams } from "../common"
import { AddressZero, TOKEN_PAYMASTER_CONTRACT_INTERFACE } from "../common/constants"
import { EnvOption } from "../config"
import { Chain, Token, UserOperation } from "../data"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getWalletPermitHash, getWalletPermitNonce } from "../utils"
export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, TOKEN_PAYMASTER_CONTRACT_INTERFACE, "tokenPaymasterAddress", PaymasterType.TokenSponsor)
        if (!options.gasSponsor?.token) {
            throw new InvalidParameterError(
                ErrorCode.MissingParameter,
                "token field is missing",
                "TokenSponsor.constructor",
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
                    "TokenSponsor.getFunSponsorAddress",
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
        partialOp: UserOperation,
        walletAddr: Address,
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<string> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const { maxFeePerGas } = partialOp
        const { callGasLimit, verificationGasLimit, preVerificationGas } = await chain.estimateOpGas(partialOp)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const requiredGas = callGasLimit + verificationGasLimit * 3n + preVerificationGas * maxFeePerGas
        const tokenAmount = await TOKEN_PAYMASTER_CONTRACT_INTERFACE.readFromChain(
            paymasterAddress,
            "getTokenValueOfEth",
            [this.token, requiredGas],
            chain
        )
        const decAmount = await Token.getDecimalAmount(this.token, tokenAmount, options)
        const nonce = await getWalletPermitNonce(walletAddr, chain)
        const tokenAddress = await Token.getAddress(this.token, options)
        const factoryAddress = await chain.getAddress("factoryAddress")
        const hash = await getWalletPermitHash(factoryAddress, chain, tokenAddress, paymasterAddress, decAmount, nonce)

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
        sponsor: Address,
        walletAddress: string,
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
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token: "eth"
            },
            this.paymasterType,
            walletAddress
        )

        return this.contractInterface.encodeTransactionParams(
            await this.getPaymasterAddress(),
            "addEthDepositTo",
            [walletAddress, amountdec],
            BigInt(amountdec)
        )
    }

    async unstake(
        sponsor: Address,
        walletAddress: string,
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
            walletAddress
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawEthDepositTo", [
            walletAddress,
            amountdec
        ])
    }

    async getUnlockBlock(tokenAddr: string, sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        return (await this.getAllTokenData(tokenAddr, sponsor, options)).unlockBlock
    }

    // false means unlocked, true means locked
    async getLockState(token: string, sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const tokenAddr = (await Token.isNative(token)) ? AddressZero : token
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
        tokenAddr: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<AllTokenData> {
        const tokenAddress = await Token.getAddress(tokenAddr, options)
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

    async getTokenBalance(token: string, spender: string, options: EnvOption = (globalThis as any).globalEnvOption) {
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

    async stakeToken(
        sponsor: Address,
        token: string,
        walletAddress: string,
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
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token
            },
            this.paymasterType,
            walletAddress
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "addTokenDepositTo", [
            tokenAddress,
            walletAddress,
            amountdec
        ])
    }

    async unstakeToken(
        sponsor: Address,
        token: string,
        walletAddress: string,
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
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token
            },
            this.paymasterType,
            walletAddress
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawTokenDepositTo", [
            tokenAddress,
            walletAddress,
            amountdec
        ])
    }

    async lockTokenDeposit(tokenData: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const token = new Token(tokenData)
        const tokenAddress = token.isNative ? AddressZero : await token.getAddress(options)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "lockTokenDeposit", [tokenAddress])
    }

    async unlockTokenDepositAfter(
        tokenData: string,
        blocksToWait: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const token = new Token(tokenData)
        const tokenAddress = token.isNative ? AddressZero : await token.getAddress(options)
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
        sponsor: Address,
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
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token
            },
            this.paymasterType,
            sponsor
        )
        return Token.approve(token, gasSponsorAddress, amount)
    }

    async getSpenderBlacklisted(
        spender: string,
        sponsor: string,
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
        spender: string,
        sponsor: string,
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

    async getTokenWhitelisted(
        tokenAddr: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const tokenAddress = await Token.getAddress(tokenAddr, options)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenWhitelisted",
            [tokenAddress, sponsor],
            chain
        )
    }

    async setTokenToWhiteListMode(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
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

    async getTokenBlacklisted(
        tokenAddr: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBlacklisted",
            [tokenAddr, sponsor],
            chain
        )
    }

    async setTokenToBlackListMode(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
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
