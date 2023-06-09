import { Address, formatUnits, isAddress, parseUnits } from "viem"
import { getChainFromData } from "./Chain"
import { getTokenInfo } from "../apis"
import { TransactionData, erc20ContractInterface } from "../common"
import { EnvOption } from "../config"
import { Helper, TransactionError } from "../errors"

const nativeTokens = ["eth", "matic"]
const wrappedNativeTokens = { eth: "weth", matic: "wmatic" }

export class Token {
    address?: Address
    isNative = false
    symbol = ""

    constructor(input: Address | string) {
        if (isAddress(input)) {
            this.address = input
            return
        } else if (nativeTokens.includes(input.toLowerCase())) {
            this.isNative = true
        }

        this.symbol = input
    }

    async getAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
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

    async getDecimals(options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        if (this.isNative) {
            return 18n
        }
        const chain = await getChainFromData(options.chain)
        return await erc20ContractInterface.readFromChain(await this.getAddress(options), "decimals", [], chain)
    }

    async getBalance(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const amount = await this.getBalanceBN(address, options)
        const decimals = await this.getDecimals(options)
        return formatUnits(amount, Number(decimals))
    }

    async getBalanceBN(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(options.chain)
        let amount = 0n
        if (this.isNative) {
            const client = await chain.getClient()
            amount = await client.getBalance({ address })
        } else {
            amount = await erc20ContractInterface.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
        }
        return amount
    }

    async getApproval(owner: string, spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigInt> {
        if (this.isNative) {
            const helper = new Helper("approval", this, "Native token can not approve")
            throw new TransactionError("Token.getApproval", helper)
        }
        const chain = await getChainFromData(options.chain)
        return BigInt(await erc20ContractInterface.readFromChain(await this.getAddress(options), "allowance", [owner, spender], chain))
    }

    async getDecimalAmount(amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigInt> {
        const decimals = await this.getDecimals(options)
        return parseUnits(`${amount}`, Number(decimals))
    }

    async approve(spender: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const amountDec = await this.getDecimalAmount(amount)
        const calldata = await erc20ContractInterface.encodeTransactionData(await this.getAddress(options), "approve", [spender, amountDec])
        const { to, data, value } = calldata
        return { to: to!, data: data!, value: value!, chain }
    }

    async transfer(spender: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const amountDec = await this.getDecimalAmount(amount)
        const calldata = await erc20ContractInterface.encodeTransactionData(await this.getAddress(options), "transfer", [
            spender,
            amountDec
        ])
        const { to, data, value } = calldata
        return { to: to!, data: data!, value: value!, chain }
    }

    static async getAddress(data: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const token = new Token(data)
        return await token.getAddress(options)
    }

    static async getDecimals(data: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const token = new Token(data)
        return await token.getDecimals(options)
    }

    static async getBalance(data: string, address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const token = new Token(data)
        return await token.getBalance(address, options)
    }

    static async getBalanceBN(data: string, address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigInt> {
        const token = new Token(data)
        return await token.getBalanceBN(address, options)
    }

    static async getApproval(
        data: string,
        owner: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<BigInt> {
        const token = new Token(data)
        return await token.getApproval(owner, spender, options)
    }
    static async getDecimalAmount(data: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigInt> {
        const token = new Token(data)
        return await token.getDecimalAmount(amount, options)
    }

    static async approve(
        data: string,
        spender: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionData> {
        const token = new Token(data)
        return await token.approve(spender, amount, options)
    }

    static async transfer(
        data: string,
        spender: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionData> {
        const token = new Token(data)
        return await token.transfer(spender, amount, options)
    }

    static isNative(data: string): boolean {
        return nativeTokens.includes(data.toLowerCase())
    }
}
