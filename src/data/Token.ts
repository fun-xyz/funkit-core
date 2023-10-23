import { Address, formatUnits, isAddress, parseUnits } from "viem"
import { getTokenInfo } from "../apis"
import { ERC20_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { ErrorCode, InternalFailureError, InvalidParameterError } from "../errors"
import { FunWallet } from "../wallet"

const wrappedNativeTokens = { eth: "weth", matic: "wmatic" }

export class Token {
    address?: Address
    ownerWallet!: FunWallet
    isNative = false
    symbol = ""

    constructor(input: Address | string, wallet: FunWallet) {
        if (!wallet) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Owner Fun wallet is required",
                { wallet },
                "Please provide valid owner wallet",
                "https://docs.fun.xyz"
            )
        }
        if (isAddress(input)) {
            this.address = input
            return
        } else if (input.toLowerCase() in wrappedNativeTokens) {
            this.isNative = true
        }

        this.symbol = input.toLowerCase()
        this.ownerWallet = wallet
    }

    async getAddress(): Promise<Address> {
        const chainId = this.ownerWallet.getChain().getChainId()

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

    async getDecimals(): Promise<bigint> {
        if (this.isNative) {
            return 18n
        }
        const chain = this.ownerWallet.getChain()
        return await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "decimals", [], chain)
    }

    async getBalance(): Promise<string> {
        if (!this.address) {
            this.address = await this.getAddress()
        }
        const amount = await this.getBalanceBN(this.address)
        const decimals = await this.getDecimals()
        return formatUnits(amount, Number(decimals))
    }

    async getBalanceBN(address: Address): Promise<bigint> {
        const chain = this.ownerWallet.getChain()
        let amount = 0n
        if (this.isNative) {
            const client = await chain.getClient()
            amount = await client.getBalance({ address })
        } else {
            amount = await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
        }
        return amount
    }

    async getApproval(owner: string, spender: string): Promise<bigint> {
        if (this.isNative) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Native token can not approve",
                { isNative: this.isNative },
                "No need to approve native token",
                "https://docs.fun.xyz"
            )
        }
        const chain = this.ownerWallet.getChain()
        return BigInt(await ERC20_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "allowance", [owner, spender], chain))
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

    static async getAddress(data: string, wallet: FunWallet): Promise<Address> {
        const token = new Token(data, wallet)
        return await token.getAddress()
    }

    static async getDecimals(data: string, wallet: FunWallet): Promise<bigint> {
        const token = new Token(data, wallet)
        return await token.getDecimals()
    }

    static async getBalance(data: string, wallet: FunWallet): Promise<string> {
        const token = new Token(data, wallet)
        return await token.getBalance()
    }

    static async getBalanceBN(data: string, address: Address, wallet: FunWallet): Promise<bigint> {
        const token = new Token(data, wallet)
        return await token.getBalanceBN(address)
    }

    static async getApproval(data: string, owner: string, spender: string, wallet: FunWallet): Promise<bigint> {
        const token = new Token(data, wallet)
        return await token.getApproval(owner, spender)
    }
    static async getDecimalAmount(data: string, amount: number, wallet: FunWallet): Promise<bigint> {
        const token = new Token(data, wallet)
        return await token.getDecimalAmount(amount)
    }

    static async approve(data: string, spender: string, amount: number, wallet: FunWallet): Promise<TransactionParams> {
        const token = new Token(data, wallet)
        return await token.approve(spender, amount)
    }

    static async transfer(data: string, spender: string, amount: number, wallet: FunWallet): Promise<TransactionParams> {
        const token = new Token(data, wallet)
        return await token.transfer(spender, amount)
    }

    static isNative(data: string): boolean {
        return data.toLowerCase() in wrappedNativeTokens
    }
}
