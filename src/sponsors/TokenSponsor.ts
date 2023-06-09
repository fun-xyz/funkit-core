import { Address, encodeAbiParameters } from "viem"
import { Sponsor } from "./Sponsor"
import { ActionFunction } from "../actions"
import { Auth } from "../auth"
import { AddressZero, tokenPaymasterContractInterface, walletContractInterface } from "../common/constants"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"
export class TokenSponsor extends Sponsor {
    token: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, tokenPaymasterContractInterface, "tokenSponsorAddress")
        this.token = options.gasSponsor!.token!.toLowerCase()
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const tokenAddress = await Token.getAddress(this.token, options)
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2) + tokenAddress.slice(2)
    }

    async getPaymasterAndDataPermit(
        amount: bigint,
        walletAddr: Address,
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<string> {
        const chain = await getChainFromData(options.chain)
        const nonce = await walletContractInterface.readFromChain(walletAddr, "getNonce", [0], chain)
        const paymasterAddress = await this.getPaymasterAddress(options)
        const tokenAddress = await Token.getAddress(this.token, options)
        const hash = await walletContractInterface.readFromChain(
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
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2) + tokenAddress.slice(2) + encoded.slice(2)
    }

    stake(walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)

            const data = this.contractInterface.encodeData("addEthDepositTo", [walletAddress, amountdec])
return await this.encode(data, options, amountdec)

        }
    }

    unstake(walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.contractInterface.encodeData("withdrawEthDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async getTokenInfo(token: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const tokenAddress = await Token.getAddress(token, options)
        const chain = await getChainFromData(options.chain)
        return await tokenPaymasterContractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getToken",
            [tokenAddress],
            chain
        )
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
        return await tokenPaymasterContractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getTokenBalance",
            [tokenAddress, spender],
            chain
        )
    }

    async getListMode(spender: string, options: EnvOption = (globalThis as any).globalEnvOption) {
        const chain = await getChainFromData(options.chain)
        return await tokenPaymasterContractInterface.readFromChain(await this.getPaymasterAddress(options), "getListMode", [spender], chain)
    }

    async getAllTokens(options: EnvOption = (globalThis as any).globalEnvOption) {
        const contract = await this.getContract(options)
        return await contract.getAllTokens()
    }

    addUsableToken(oracle: string, token: string, aggregator: string): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const decimals = await Token.getDecimals(token, options)
            const tokenAddress = await Token.getAddress(token, options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.contractInterface.encodeData("setTokenData", [data])
            return await this.encode(calldata, options)
        }
    }

    stakeToken(token: string, walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.contractInterface.encodeData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    unstakeToken(token: string, walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.contractInterface.encodeData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    addWhitelistTokens(tokens: string[]): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const sendTokens = await Promise.all(
                tokens.map((token) => {
                    return Token.getAddress(token, options)
                })
            )
            const data = this.contractInterface.encodeData("useTokens", [sendTokens])
            return await this.encode(data, options)
        }
    }

    removeWhitelistTokens(tokens: string[]): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const sendTokens = await Promise.all(
                tokens.map((token) => {
                    return Token.getAddress(token, options)
                })
            )
            const data = this.contractInterface.encodeData("removeTokens", [sendTokens])
            return await this.encode(data, options)
        }
    }

    lockTokenDeposit(token: string): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("lockTokenDeposit", [token])
            return await this.encode(data, options)
        }
    }

    unlockTokenDepositAfter(token: string, blocksToWait: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("unlockTokenDepositAfter", [token, blocksToWait])
            return await this.encode(data, options)
        }
    }

    approve(token: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const gasSponsorAddress = await this.getPaymasterAddress(options)
            return { data: await Token.approve(token, gasSponsorAddress, amount), errorData: { location: "" } }
        }
    }
}
