import { Address, formatUnits, isAddress, parseUnits } from "viem"
import { Chain } from "./Chain"
import { getTokenInfo } from "../apis"
import { ERC20_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { ErrorCode, InternalFailureError, InvalidParameterError } from "../errors"

const wrappedNativeTokens = { eth: "weth", matic: "wmatic" }

export class Token {
    address?: Address
    chain: Chain
    isNative = false
    symbol = ""
    apiKey: string
    walletAddress: Address

    constructor(input: Address | string, chain: Chain, walletAddress: Address, apiKey: string) {
        this.chain = chain
        this.walletAddress = walletAddress
        this.apiKey = apiKey

        if (isAddress(input)) {
            this.address = input
            return
        } else if (input.toLowerCase() in wrappedNativeTokens) {
            this.isNative = true
        }

        this.symbol = input.toLowerCase()
    }

    async getAddress(): Promise<Address> {
        const chainId = this.chain.getChainId()

        if (this.isNative) {
            const nativeName = (wrappedNativeTokens as any)[this.symbol]
            return await getTokenInfo(nativeName, chainId, this.apiKey)
        } else if (this.address) {
            return this.address
        } else if (this.symbol) {
            return await getTokenInfo(this.symbol, chainId, this.apiKey)
        } else {
            throw new InternalFailureError(
                ErrorCode.ServerMissingData,
                "server missing token symbol and address info",
                { symbol: this.symbol, address: this.address, isNative: this.isNative },
                "Please check token symbol and address. If things look correct, contract fun support for help",
                "https://docs.fun.xyz"
            )
        }
    }

    async getDecimals(): Promise<bigint> {
        if (this.isNative) {
            return 18n
        }
        return await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "decimals", [], this.chain)
    }

    async getBalance(): Promise<string> {
        const amount = await this.getBalanceBN()
        const decimals = await this.getDecimals()
        return formatUnits(amount, Number(decimals))
    }

    async getBalanceBN(): Promise<bigint> {
        const chain = this.chain
        let amount = 0n
        if (this.isNative) {
            const client = await chain.getClient()
            amount = await client.getBalance({ address: this.walletAddress })
        } else {
            amount = await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "balanceOf", [this.walletAddress], chain)
        }
        return amount
    }

    async getApproval(spender: string): Promise<bigint> {
        if (this.isNative) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Native token can not approve",
                { isNative: this.isNative },
                "No need to approve native token",
                "https://docs.fun.xyz"
            )
        }
        const chain = this.chain
        return BigInt(
            await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "allowance", [this.walletAddress, spender], chain)
        )
    }

    async getDecimalAmount(amount: number): Promise<bigint> {
        const decimals = await this.getDecimals()
        return parseUnits(`${amount}`, Number(decimals))
    }

    async approve(spender: string, amount: number): Promise<TransactionParams> {
        const amountDec = await this.getDecimalAmount(amount)
        const calldata = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "approve", [spender, amountDec])
        const { to, data, value } = calldata
        return { to: to!, data: data!, value: value! }
    }

    async transfer(spender: string, amount: number): Promise<TransactionParams> {
        const amountDec = await this.getDecimalAmount(amount)
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "transfer", [spender, amountDec])
    }

    static async getAddress(data: string, chain: Chain, apiKey: string): Promise<Address> {
        const token = new Token(data, chain, "0x", apiKey)
        return await token.getAddress()
    }

    static async getDecimals(data: string, chain: Chain, apiKey: string): Promise<bigint> {
        const token = new Token(data, chain, "0x", apiKey)
        return await token.getDecimals()
    }

    // token address, ownerWallet address, chain
    static async getBalance(data: string, address: Address, chain: Chain, apiKey: string): Promise<string> {
        const token = new Token(data, chain, address, apiKey)
        return await token.getBalance()
    }

    static async getBalanceBN(data: string, address: Address, chain: Chain, apiKey: string): Promise<bigint> {
        const token = new Token(data, chain, address, apiKey)
        return await token.getBalanceBN()
    }

    static async getApproval(data: string, owner: Address, spender: string, chain: Chain, apiKey: string): Promise<bigint> {
        const token = new Token(data, chain, owner, apiKey)
        return await token.getApproval(spender)
    }
    static async getDecimalAmount(data: string, amount: number, chain: Chain, apiKey: string): Promise<bigint> {
        const token = new Token(data, chain, "0x", apiKey)
        return await token.getDecimalAmount(amount)
    }

    static async approve(data: string, spender: string, amount: number, chain: Chain, apiKey: string): Promise<TransactionParams> {
        const token = new Token(data, chain, "0x", apiKey)
        return await token.approve(spender, amount)
    }

    static async transfer(data: string, spender: string, amount: number, chain: Chain, apiKey: string): Promise<TransactionParams> {
        const token = new Token(data, chain, "0x", apiKey)
        return await token.transfer(spender, amount)
    }

    static isNative(data: string): boolean {
        return data.toLowerCase() in wrappedNativeTokens
    }
}
