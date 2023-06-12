import { Address, encodeAbiParameters } from "viem"
import { Sponsor } from "./Sponsor"
import { AllTokenData, PaymasterType } from "./types"
import { ActionData, ActionFunction } from "../actions"
import { addPaymasterToken, addTransaction, batchOperation, updatePaymasterMode } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { AddressZero, TOKEN_PAYMASTER_CONTRACT_INTERFACE, WALLET_CONTRACT_INTERFACE } from "../common/constants"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, TOKEN_PAYMASTER_CONTRACT_INTERFACE, "tokenSponsorAddress", PaymasterType.TokenSponsor)
        this.token = options.gasSponsor!.token!.toLowerCase()
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const tokenAddress = await Token.getAddress(this.token, options)
        return (await this.getPaymasterAddress(options)) + (await this.getSponsorAddress(options)).slice(2) + tokenAddress.slice(2)
    }

    async getPaymasterAndDataPermit(
        amount: bigint,
        walletAddr: Address,
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<string> {
        const chain = await getChainFromData(options.chain)
        const nonce = await WALLET_CONTRACT_INTERFACE.readFromChain(walletAddr, "getNonce", [0], chain)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const tokenAddress = await Token.getAddress(this.token, options)
        const hash = await WALLET_CONTRACT_INTERFACE.readFromChain(
            walletAddr,
            "getPermitHash",
            [tokenAddress, paymasterAddress, amount, nonce],
            chain
        )
        const sig = await auth.signHash(hash)
        const encoded = encodeAbiParameters(
            [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes" }],
            [tokenAddress, paymasterAddress, amount, nonce, sig]
        )
        return (
            (await this.getPaymasterAddress(options)) +
            (await this.getSponsorAddress(options)).slice(2) +
            tokenAddress.slice(2) +
            encoded.slice(2)
        )
    }

    stake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.contractInterface.encodeData("addEthDepositTo", [walletAddress, amountdec])
            await addTransaction(
                await actionData.chain.getChainId(),
                {
                    action: "stake",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )

            return await this.encode(data, actionData.options, amountdec)
        }
    }

    unstake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.contractInterface.encodeData("withdrawEthDepositTo", [walletAddress, amountdec])
            await addTransaction(
                await actionData.chain.getChainId(),
                {
                    action: "unstake",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, actionData.options)
        }
    }

    async getUnlockBlock(tokenAddr: string, sponsor: string): Promise<bigint> {
        return (await this.getAllTokenData(tokenAddr, sponsor)).unlockBlock
    }

    // false means unlocked, true means locked
    async getLockState(token: string, sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const tokenAddr = (await Token.isNative(token)) ? AddressZero : token
        const unlockBlock = await this.getUnlockBlock(tokenAddr, sponsor)
        const chain = await getChainFromData(options.chain)
        const provider = await chain.getClient()
        const currentBlock = await provider.getBlockNumber()
        return unlockBlock === 0n || unlockBlock > currentBlock
    }

    async getTokenInfo(token: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const tokenAddress = await Token.getAddress(token, options)
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getToken", [tokenAddress], chain)
    }

    async getAllTokenData(
        tokenAddr: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<AllTokenData> {
        const tokenAddress = await Token.getAddress(tokenAddr, options)
        const chain = await getChainFromData(options.chain)

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

        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBalance",
            [tokenAddress, spender],
            chain
        )
    }

    async getAllTokens(options: EnvOption = (globalThis as any).globalEnvOption) {
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getAllTokens", [], chain)
    }

    addUsableToken(oracle: string, token: string, aggregator: string): ActionFunction {
        return async (actionData: ActionData) => {
            const decimals = await Token.getDecimals(token, actionData.options)
            const tokenAddress = await Token.getAddress(token, actionData.options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.contractInterface.encodeData("setTokenData", [data])

            const chain = await getChainFromData(actionData.chain)
            await addPaymasterToken(await chain.getChainId(), token)
            return await this.encode(calldata, actionData.options)
        }
    }

    stakeToken(token: string, walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(actionData.options)
            const amountdec = await tokenObj.getDecimalAmount(amount, actionData.options)

            const data = this.contractInterface.encodeData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])

            const chain = await getChainFromData(actionData.chain)
            addTransaction(
                await chain.getChainId(),
                {
                    action: "stakeToken",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, actionData.options)
        }
    }

    unstakeToken(token: string, walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(actionData.options)
            const amountdec = await tokenObj.getDecimalAmount(amount, actionData.options)

            const data = this.contractInterface.encodeData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])

            const chain = await getChainFromData(actionData.chain)
            addTransaction(
                await chain.getChainId(),
                {
                    action: "unstakeToken",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, actionData.options)
        }
    }

    lockTokenDeposit(tokenData: string): ActionFunction {
        return async (actionData: ActionData) => {
            const token = new Token(tokenData)
            const tokenAddress = token.isNative ? AddressZero : await token.getAddress(actionData.options)
            const data = this.contractInterface.encodeData("lockTokenDeposit", [tokenAddress])

            return await this.encode(data, actionData.options)
        }
    }

    unlockTokenDepositAfter(tokenData: string, blocksToWait: number): ActionFunction {
        return async (actionData: ActionData) => {
            const token = new Token(tokenData)
            const tokenAddress = token.isNative ? AddressZero : await token.getAddress(actionData.options)
            const data = this.contractInterface.encodeData("unlockTokenDepositAfter", [tokenAddress, blocksToWait])
            return await this.encode(data, actionData.options)
        }
    }

    lockDeposit(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.contractInterface.encodeData("lockTokenDeposit", [AddressZero])
            return await this.encode(data, actionData.options)
        }
    }

    unlockDepositAfter(blocksToWait: number): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.contractInterface.encodeData("unlockTokenDepositAfter", [AddressZero, blocksToWait])
            return await this.encode(data, actionData.options)
        }
    }

    approve(token: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const gasSponsorAddress = await this.getPaymasterAddress(actionData.options)

            const chain = await getChainFromData(actionData.chain)
            addTransaction(
                await chain.getChainId(),
                {
                    action: "approve",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token
                },
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            return { data: await Token.approve(token, gasSponsorAddress, amount), errorData: { location: "TokenSponsor approve" } }
        }
    }

    async getSpenderBlacklisted(
        spender: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await getChainFromData(options.chain)
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
        const chain = await getChainFromData(options.chain)
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
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenWhitelisted",
            [tokenAddr, sponsor],
            chain
        )
    }

    setTokenToWhiteListMode(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.contractInterface.encodeData("setTokenListMode", [false])
            const chain = await getChainFromData(actionData.chain)
            await updatePaymasterMode(
                await chain.getChainId(),
                { tokenMode: "whitelist" },
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            return await this.encode(data, actionData.options)
        }
    }

    batchWhitelistTokens(tokens: string[], modes: boolean[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: string[] = []
            for (let i = 0; i < tokens.length; i++) {
                const tokenAddress = await Token.getAddress(tokens[i], actionData.options)
                calldata.push(this.contractInterface.encodeData("setTokenWhitelistMode", [tokenAddress, modes[i]]))
            }
            const data = this.contractInterface.encodeData("batchActions", [calldata])
            const chain = await getChainFromData(actionData.chain)
            await batchOperation(
                await chain.getChainId(),
                tokens,
                modes,
                "tokensWhiteList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            return await this.encode(data, actionData.options)
        }
    }

    async getTokenBlacklisted(
        tokenAddr: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBlacklisted",
            [tokenAddr, sponsor],
            chain
        )
    }

    setTokenToBlackListMode(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.contractInterface.encodeData("setTokenListMode", [true])
            const chain = await getChainFromData(actionData.chain)

            await updatePaymasterMode(
                await chain.getChainId(),
                { tokenMode: "blacklist" },
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            return await this.encode(data, actionData.options)
        }
    }

    batchBlacklistTokens(tokens: string[], modes: boolean[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: string[] = []
            for (let i = 0; i < tokens.length; i++) {
                const tokenAddress = await Token.getAddress(tokens[i], actionData.options)
                calldata.push(this.contractInterface.encodeData("setTokenBlacklistMode", [tokenAddress, modes[i]]))
            }
            const data = this.contractInterface.encodeData("batchActions", [calldata])

            const chain = await getChainFromData(actionData.chain)
            await batchOperation(
                await chain.getChainId(),
                tokens,
                modes,
                "tokensBlackList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            return await this.encode(data, actionData.options)
        }
    }
}
