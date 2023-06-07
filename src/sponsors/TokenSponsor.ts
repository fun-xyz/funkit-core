import { BigNumber, Contract, constants } from "ethers"
import { defaultAbiCoder } from "ethers/lib/utils"
import { Sponsor } from "./Sponsor"
import { addPaymasterToken, addTransaction, batchOperation, updatePaymasterMode } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { TOKEN_PAYMASTER_ABI, WALLET_ABI } from "../common/constants"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export const TOKEN_SPONSOR_TYPE = "tokenSponsor"

export interface AllTokenData {
    unlockBlock: BigNumber
    tokenAmount: BigNumber
}

export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, TOKEN_PAYMASTER_ABI, "tokenSponsorAddress", TOKEN_SPONSOR_TYPE)
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

    stake(walletAddress: string, amount: number): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addEthDepositTo", [walletAddress, amountdec])

            const chain = await getChainFromData(options.chain)
            await addTransaction(
                await chain.getChainId(),
                {
                    action: "stake",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress: string, amount: number): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawEthDepositTo", [walletAddress, amountdec])

            const chain = await getChainFromData(options.chain)
            await addTransaction(
                await chain.getChainId(),
                {
                    action: "unstake",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, options)
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
        if (1 <= unlockBlock && unlockBlock <= currentBlock) {
            return false
        }
        return true
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

    addUsableToken(oracle: string, token: string, aggregator: string) {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const decimals = await Token.getDecimals(token, options)
            const tokenAddress = await Token.getAddress(token, options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.interface.encodeFunctionData("setTokenData", [data])

            const chain = await getChainFromData(options.chain)
            await addPaymasterToken(await chain.getChainId(), token)
            return await this.encode(calldata, options)
        }
    }

    stakeToken(token: string, walletAddress: string, amount: number) {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])

            const chain = await getChainFromData(options.chain)
            addTransaction(
                await chain.getChainId(),
                {
                    action: "stakeToken",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, options)
        }
    }

    unstakeToken(token: string, walletAddress: string, amount: number) {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])

            const chain = await getChainFromData(options.chain)
            addTransaction(
                await chain.getChainId(),
                {
                    action: "unstakeToken",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, options)
        }
    }

    lockTokenDeposit(token: string) {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [token])
            return await this.encode(data, options)
        }
    }

    unlockTokenDepositAfter(token: string, blocksToWait: number) {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [token, blocksToWait])
            return await this.encode(data, options)
        }
    }

    lockDeposit(): Function {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [constants.AddressZero])
            return await this.encode(data, options)
        }
    }

    unlockDepositAfter(blocksToWait: number): Function {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [constants.AddressZero, blocksToWait])
            return await this.encode(data, options)
        }
    }

    approve(token: string, amount: number) {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const gasSponsorAddress = await this.getPaymasterAddress(options)

            const chain = await getChainFromData(options.chain)
            addTransaction(
                await chain.getChainId(),
                {
                    action: "approve",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token
                },
                this.paymasterType,
                sponsorAddress
            )
            return await Token.approve(token, gasSponsorAddress, amount)
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

    setTokenToWhiteListMode() {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setTokenListMode", [false])
            const chain = await getChainFromData(options.chain)
            await updatePaymasterMode(await chain.getChainId(), { tokenMode: "whitelist" }, this.paymasterType, sponsorAddress)
            return await this.encode(data, options)
        }
    }

    batchWhitelistTokens(tokens: string[], modes: boolean[]) {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const calldata: string[] = []
            for (let i = 0; i < tokens.length; i++) {
                const tokenAddress = await Token.getAddress(tokens[i], options)
                calldata.push(this.interface.encodeFunctionData("setTokenWhitelistMode", [tokenAddress, modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            const chain = await getChainFromData(options.chain)
            await batchOperation(await chain.getChainId(), tokens, modes, "tokensWhiteList", this.paymasterType, sponsorAddress)
            return await this.encode(data, options)
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

    setTokenToBlackListMode() {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setTokenListMode", [true])
            const chain = await getChainFromData(options.chain)

            await updatePaymasterMode(await chain.getChainId(), { tokenMode: "blacklist" }, this.paymasterType, sponsorAddress)
            return await this.encode(data, options)
        }
    }

    batchBlacklistTokens(tokens: string[], modes: boolean[]) {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const calldata: string[] = []
            for (let i = 0; i < tokens.length; i++) {
                const tokenAddress = await Token.getAddress(tokens[i], options)
                calldata.push(this.interface.encodeFunctionData("setTokenBlacklistMode", [tokenAddress, modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])

            const chain = await getChainFromData(options.chain)
            await batchOperation(await chain.getChainId(), tokens, modes, "tokensBlackList", this.paymasterType, sponsorAddress)
            return await this.encode(data, options)
        }
    }
}
