import { Contract, constants } from "ethers"
import { defaultAbiCoder } from "ethers/lib/utils"
import { Sponsor } from "./Sponsor"
import { AllTokenData, PaymasterType } from "./types"
import { ActionData, ActionFunction } from "../actions"
import { addPaymasterToken, addTransaction, batchOperation, updatePaymasterMode } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { TOKEN_PAYMASTER_ABI, WALLET_ABI } from "../common/constants"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, TOKEN_PAYMASTER_ABI, "tokenSponsorAddress", PaymasterType.TokenSponsor)
        this.token = options.gasSponsor!.token!.toLowerCase()
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const tokenAddress = await Token.getAddress(this.token, options)
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2) + tokenAddress.slice(2)
    }

    async getPaymasterAndDataPermit(
        amount: number,
        walletAddr: string,
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<string> {
        const chain = await getChainFromData(options.chain)
        const provider = await chain.getProvider()
        const walletContract = new Contract(walletAddr, WALLET_ABI, provider)
        const nonce = await walletContract.getNonce(0)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const tokenAddress = await Token.getAddress(this.token, options)
        const hash = await walletContract.getPermitHash(tokenAddress, paymasterAddress, amount, nonce)
        const sig = await auth.signHash(hash)
        const encoded = defaultAbiCoder.encode(
            ["address", "address", "uint256", "uint256", "bytes"],
            [tokenAddress, paymasterAddress, amount, nonce, sig]
        )
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2) + tokenAddress.slice(2) + encoded.slice(2)
    }

    stake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.interface.encodeFunctionData("addEthDepositTo", [walletAddress, amountdec])

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
            const data = this.interface.encodeFunctionData("withdrawEthDepositTo", [walletAddress, amountdec])

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

    async getUnlockBlock(tokenAddr: string, sponsor: string): Promise<number> {
        return Number((await this.getAllTokenData(tokenAddr, sponsor)).unlockBlock.toString())
    }

    // false means unlocked, true means locked
    async getLockState(token: string, sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const tokenAddr = (await Token.isNative(token)) ? constants.AddressZero : token
        const unlockBlock = await this.getUnlockBlock(tokenAddr, sponsor)
        const chain = await getChainFromData(options.chain)
        const provider = await chain.getProvider()
        const currentBlock = await provider.getBlockNumber()
        return unlockBlock > 0 && unlockBlock > currentBlock
    }

    async getTokenInfo(token: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        const tokenAddress = await Token.getAddress(token, options)
        return await contract.getToken(tokenAddress)
    }

    async getAllTokenData(
        tokenAddr: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<AllTokenData> {
        const contract = await this.getContract(options)
        const tokenAddress = await Token.getAddress(tokenAddr, options)
        return await contract.getAllTokenData(tokenAddress, spender)
    }

    async getTokenBalance(token: string, spender: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        const tokenData = new Token(token)
        let tokenAddress
        if (tokenData.isNative) {
            tokenAddress = constants.AddressZero
        } else {
            tokenAddress = await tokenData.getAddress(options)
        }
        return await contract.getTokenBalance(tokenAddress, spender)
    }

    async getAllTokens(options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        return await contract.getAllTokens()
    }

    addUsableToken(oracle: string, token: string, aggregator: string): ActionFunction {
        return async (actionData: ActionData) => {
            const decimals = await Token.getDecimals(token, actionData.options)
            const tokenAddress = await Token.getAddress(token, actionData.options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.interface.encodeFunctionData("setTokenData", [data])

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

            const data = this.interface.encodeFunctionData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])

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

            const data = this.interface.encodeFunctionData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])

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

    lockTokenDeposit(token: string): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [token])
            return await this.encode(data, actionData.options)
        }
    }

    unlockTokenDepositAfter(token: string, blocksToWait: number): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [token, blocksToWait])
            return await this.encode(data, actionData.options)
        }
    }

    lockDeposit(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [constants.AddressZero])
            return await this.encode(data, actionData.options)
        }
    }

    unlockDepositAfter(blocksToWait: number): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [constants.AddressZero, blocksToWait])
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
        const contract = await this.getContract(options)
        return await contract.getSpenderBlacklisted(spender, sponsor)
    }

    async getSpenderWhitelisted(
        spender: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const contract = await this.getContract(options)
        return await contract.getSpenderWhitelisted(spender, sponsor)
    }

    async getTokenWhitelisted(
        tokenAddr: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const contract = await this.getContract(options)
        return await contract.getTokenWhitelisted(tokenAddr, sponsor)
    }

    setTokenToWhiteListMode(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("setTokenListMode", [false])
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
                calldata.push(this.interface.encodeFunctionData("setTokenWhitelistMode", [tokenAddress, modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
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
        const contract = await this.getContract(options)
        return await contract.getTokenBlacklisted(tokenAddr, sponsor)
    }

    setTokenToBlackListMode(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("setTokenListMode", [true])
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
                calldata.push(this.interface.encodeFunctionData("setTokenBlacklistMode", [tokenAddress, modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])

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
