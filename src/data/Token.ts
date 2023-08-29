import { Address, formatUnits, isAddress, parseUnits } from "viem"
import { Chain } from "./Chain"
import { getTokenInfo } from "../apis"
import { ERC20_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { ErrorCode, InternalFailureError, InvalidParameterError } from "../errors"

const wrappedNativeTokens = { eth: "weth", matic: "wmatic" }

export class Token {
    address?: Address
    isNative = false
    symbol = ""

    constructor(input: Address | string) {
        if (isAddress(input)) {
            this.address = input
            return
        } else if (input.toLowerCase() in wrappedNativeTokens) {
            this.isNative = true
        }

        this.symbol = input
    }

    async getAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const chainId = await chain.getChainId()

        if (this.isNative) {
            const nativeName = (wrappedNativeTokens as any)[this.symbol]
            return await getTokenInfo(nativeName, chainId)
        } else if (this.address) {
            return this.address
        } else if (this.symbol) {
            return await getTokenInfo(this.symbol, chainId)
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

    async getDecimals(options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        if (this.isNative) {
            return 18n
        }
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(options), "decimals", [], chain)
    }

    async getBalance(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const amount = await this.getBalanceBN(address, options)
        const decimals = await this.getDecimals(options)
        return formatUnits(amount, Number(decimals))
    }

    async getBalanceBN(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        let amount = 0n
        if (this.isNative) {
            const client = await chain.getClient()
            amount = await client.getBalance({ address })
        } else {
            amount = await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
        }
        return amount
    }

    async getApproval(owner: string, spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        if (this.isNative) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Native token can not approve",
                { isNative: this.isNative },
                "No need to approve native token",
                "https://docs.fun.xyz"
            )
        }
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return BigInt(await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(options), "allowance", [owner, spender], chain))
    }

    async getDecimalAmount(amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const decimals = await this.getDecimals(options)
        return parseUnits(`${amount}`, Number(decimals))
    }

    async approve(spender: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const amountDec = await this.getDecimalAmount(amount)
        const calldata = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(options), "approve", [spender, amountDec])
        const { to, data, value } = calldata
        return { to: to!, data: data!, value: value! }
    }

    async transfer(spender: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const amountDec = await this.getDecimalAmount(amount)
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(options), "transfer", [spender, amountDec])
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

    static async getBalanceBN(data: string, address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const token = new Token(data)
        return await token.getBalanceBN(address, options)
    }

    static async getApproval(
        data: string,
        owner: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<bigint> {
        const token = new Token(data)
        return await token.getApproval(owner, spender, options)
    }
    static async getDecimalAmount(data: string, amount: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const token = new Token(data)
        return await token.getDecimalAmount(amount, options)
    }

    static async approve(
        data: string,
        spender: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const token = new Token(data)
        return await token.approve(spender, amount, options)
    }

    static async transfer(
        data: string,
        spender: string,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const token = new Token(data)
        return await token.transfer(spender, amount, options)
    }

    static isNative(data: string): boolean {
        return data.toLowerCase() in wrappedNativeTokens
    }
}
