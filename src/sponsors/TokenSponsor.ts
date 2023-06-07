import { Contract, constants } from "ethers"
import { defaultAbiCoder } from "ethers/lib/utils"
import { Sponsor } from "./Sponsor"
import { ActionFunction } from "../actions"
import { Auth } from "../auth"
import { TOKEN_PAYMASTER_ABI, WALLET_ABI } from "../common/constants"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, TOKEN_PAYMASTER_ABI, "tokenSponsorAddress")
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
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addEthDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options, amountdec)
        }
    }

    unstake(walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawEthDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async getTokenInfo(token: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        const tokenAddress = await Token.getAddress(token, options)
        return await contract.getToken(tokenAddress)
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

    async getListMode(spender: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        return await contract.getListMode(spender)
    }

    async getAllTokens(options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        return await contract.getAllTokens()
    }

    addUsableToken(oracle: string, token: string, aggregator: string) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const decimals = await Token.getDecimals(token, options)
            const tokenAddress = await Token.getAddress(token, options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.interface.encodeFunctionData("setTokenData", [data])
            return await this.encode(calldata, options)
        }
    }

    stakeToken(token: string, walletAddress: string, amount: number) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    unstakeToken(token: string, walletAddress: string, amount: number) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    addWhitelistTokens(tokens: string[]) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const sendTokens = await Promise.all(
                tokens.map((token) => {
                    return Token.getAddress(token, options)
                })
            )
            const data = this.interface.encodeFunctionData("useTokens", [sendTokens])
            return await this.encode(data, options)
        }
    }

    removeWhitelistTokens(tokens: string[]) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const sendTokens = await Promise.all(
                tokens.map((token) => {
                    return Token.getAddress(token, options)
                })
            )
            const data = this.interface.encodeFunctionData("removeTokens", [sendTokens])
            return await this.encode(data, options)
        }
    }

    lockTokenDeposit(token: string) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [token])
            return await this.encode(data, options)
        }
    }

    unlockTokenDepositAfter(token: string, blocksToWait: number) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [token, blocksToWait])
            return await this.encode(data, options)
        }
    }

    approve(token: string, amount: number) {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const gasSponsorAddress = await this.getPaymasterAddress(options)
            return await Token.approve(token, gasSponsorAddress, amount)
        }
    }
}
