import { BigNumber, Contract, ethers } from "ethers"
import { parseUnits, formatUnits } from "ethers/lib/utils"
import { MissingParameterError, TransactionError, Helper } from "../errors"
import erc20 from "../abis/ERC20.json"
import { getTokenInfo } from "../apis"
import { getChainFromData } from "./Chain"
import { EnvOption } from "src/config/config"

const nativeTokens = ["eth", "matic"]
const wrappedNativeTokens = { eth: "weth", matic: "wmatic" }

export class Token {
    address = ""
    isNative = false
    symbol = ""
    contract?: Contract

    constructor(input: string, location = "Token constructor") {
        if (!input) {
            throw new MissingParameterError(location)
        }
        if (ethers.utils.isAddress(input)) {
            this.address = input
            return
        }

        if (nativeTokens.includes(input.toLowerCase())) {
            this.isNative = true
        }
        this.symbol = input
    }

    async getAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const chainId = await chain.getChainId()
        if (this.address) {
            return this.address
        }
        let tokenInfo
        if (this.isNative) {
            const nativeName = (wrappedNativeTokens as any)[this.symbol]
            tokenInfo = await getTokenInfo(nativeName, chainId)
        } else if (this.symbol) {
            tokenInfo = await getTokenInfo(this.symbol, chainId)
        }
        return tokenInfo
    }

    async getContract(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Contract> {
        const chain = await getChainFromData(options.chain)
        if (!this.contract) {
            const provider = await chain.getProvider()
            const addr = await this.getAddress()
            this.contract = new ethers.Contract(addr, erc20.abi, provider)
        }
        return this.contract
    }

    async getDecimals(options: EnvOption = (globalThis as any).globalEnvOption): Promise<number> {
        if (this.isNative) {
            return 18
        }
        const contract = await this.getContract(options)
        return await contract.decimals()
    }

    async getBalance(address: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        let amount = await this.getBalanceBN(address, options)
        const decimals = await this.getDecimals(options)
        return formatUnits(amount, decimals)
    }

    async getBalanceBN(address: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        const chain = await getChainFromData(options.chain)
        let amount: BigNumber
        if (this.isNative) {
            const provider = await chain.getProvider()
            amount = await provider.getBalance(address)
        } else {
            const contract = await this.getContract(options)
            amount = await contract.balanceOf(address)
        }
        return amount
    }

    async getApproval(owner: string, spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        if (this.isNative) {
            const helper = new Helper("approval", this, "Native token can not approve")
            throw new TransactionError("Token.getApproval", helper)
        }
        const contract = await this.getContract(options)
        return await contract.allowance(owner, spender)
    }

    async getDecimalAmount(amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        const decimals = await this.getDecimals(options)
        return parseUnits(`${amount}`, decimals)
    }

    async approve(spender: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const amountDec = await this.getDecimalAmount(amount)
        const data = await contract.populateTransaction.approve(spender, amountDec)
        return { ...data, chain }
    }

    async transfer(spender: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const amountDec = await this.getDecimalAmount(amount)
        const data = await contract.populateTransaction.transfer(spender, amountDec)
        return { ...data, chain }
    }

    static async getAddress(data: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const token = new Token(data)
        return await token.getAddress(options)
    }

    static async getDecimals(data: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<number> {
        const token = new Token(data)
        return await token.getDecimals(options)
    }

    static async getBalance(data: string, address: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const token = new Token(data)
        return await token.getBalance(address, options)
    }

    static async getBalanceBN(data: string, address: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        const token = new Token(data)
        return await token.getBalanceBN(address, options)
    }

    static async getApproval(
        data: string,
        owner: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const token = new Token(data)
        return await token.getApproval(owner, spender, options)
    }
    static async getDecimalAmount(
        data: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<BigNumber> {
        const token = new Token(data)
        return await token.getDecimalAmount(amount, options)
    }

    static async approve(
        data: string,
        spender: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const token = new Token(data)
        return await token.approve(spender, amount, options)
    }

    static async transfer(
        data: string,
        spender: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const token = new Token(data)
        return await token.transfer(spender, amount, options)
    }
}
