import { constants } from "ethers"
import { Sponsor } from "./Sponsor"
import paymaster from "../abis/TokenPaymaster.json"
import { EnvOption } from "../config"
import { Token } from "../data"

export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = globalEnvOption) {
        super(options, paymaster.abi, "tokenSponsorAddress")
        this.token = options.gasSponsor!.token!.toLowerCase()
    }

    async getPaymasterAndData(options: EnvOption = globalEnvOption): Promise<string> {
        const tokenAddress = await Token.getAddress(this.token, options)
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2) + tokenAddress.slice(2)
    }

    stake(walletAddress: string, amount: number): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addEthDepositTo", [walletAddress, amountdec])
            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress: string, amount: number): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawEthDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async getTokenInfo(token: string, options: EnvOption = globalEnvOption) {
        const contract = await this.getContract(options)
        const tokenAddress = await Token.getAddress(token, options)
        return await contract.getToken(tokenAddress)
    }

    async getTokenBalance(token: string, spender: string, options: EnvOption = globalEnvOption) {
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

    async getListMode(spender: string, options: EnvOption = globalEnvOption) {
        const contract = await this.getContract(options)
        return await contract.getListMode(spender)
    }

    addUsableToken(oracle: string, token: string, aggregator: string) {
        return async (options: EnvOption = globalEnvOption) => {
            const decimals = await Token.getDecimals(token, options)
            const tokenAddress = await Token.getAddress(token, options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.interface.encodeFunctionData("setTokenData", [data])
            return await this.encode(calldata, options)
        }
    }

    stakeToken(token: string, walletAddress: string, amount: number) {
        return async (options: EnvOption = globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    unstakeToken(token: string, walletAddress: string, amount: number) {
        return async (options: EnvOption = globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    addWhitelistTokens(tokens: string[]) {
        return async (options: EnvOption = globalEnvOption) => {
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
        return async (options: EnvOption = globalEnvOption) => {
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
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [token])
            return await this.encode(data, options)
        }
    }

    unlockTokenDepositAfter(token: string, blocksToWait: number) {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [token, blocksToWait])
            return await this.encode(data, options)
        }
    }

    approve(token: string, amount: number) {
        return async (options: EnvOption = globalEnvOption) => {
            const gasSponsorAddress = await this.getPaymasterAddress(options)
            return await Token.approve(token, gasSponsorAddress, amount)
        }
    }
}
