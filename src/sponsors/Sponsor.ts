import { Address } from "viem"
import { PaymasterType } from "./types"
import { TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { ContractInterface } from "../viem/ContractInterface"

export abstract class Sponsor {
    sponsorAddress?: Address
    contractInterface: ContractInterface
    name: string
    paymasterAddress?: Address
    paymasterType: PaymasterType
    chainId?: string

    constructor(
        options: EnvOption = (globalThis as any).globalEnvOption,
        contractInterface: ContractInterface,
        name: string,
        paymasterType: PaymasterType
    ) {
        if (options.gasSponsor !== undefined && options.gasSponsor.sponsorAddress !== undefined) {
            this.sponsorAddress = options.gasSponsor.sponsorAddress
        }
        this.contractInterface = contractInterface
        this.name = name
        this.paymasterType = paymasterType
    }

    async getPaymasterAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const chainId = await chain.getChainId()
        if (!this.paymasterAddress && chainId !== this.chainId) {
            this.paymasterAddress = await chain.getAddress(this.name)
            this.chainId = chainId
        }
        return this.paymasterAddress!
    }

    abstract getPaymasterAndData(options: EnvOption): Promise<string>

    abstract stake(sponsor: string, amount: number, options: EnvOption): Promise<TransactionParams>

    abstract unstake(receiver: string, amount: number, options: EnvOption): Promise<TransactionParams>

    abstract lockDeposit(): Promise<TransactionParams>

    abstract unlockDepositAfter(blocksToWait: number): Promise<TransactionParams>

    /** True if the specified sponsor is in blacklist mode. **/
    async getListMode(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getListMode", [sponsor], chain)
    }

    async setToBlacklistMode(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [true])
    }

    async setToWhitelistMode(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [false])
    }

    async batchTransaction(transactions: TransactionParams[]): Promise<TransactionParams> {
        const batchActionsData: any[] = transactions.map((transaction) => (transaction.data ? transaction.data : "0x"))
        const value = transactions.reduce((acc, transaction) => (transaction.value ? acc + BigInt(transaction.value) : acc), 0n)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "batchActions", [batchActionsData], value)
    }

    async addSpenderToWhitelist(spender: Address): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, true])
    }

    async removeSpenderFromWhitelist(spender: Address): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, false])
    }

    async batchWhitelistSpenders(spenders: Address[], modes: boolean[]): Promise<TransactionParams> {
        const calldata: TransactionParams[] = []
        for (let i = 0; i < spenders.length; i++) {
            if (modes[i]) {
                calldata.push(await this.addSpenderToWhitelist(spenders[i]))
            } else {
                calldata.push(await this.removeSpenderFromWhitelist(spenders[i]))
            }
        }
        return await this.batchTransaction(calldata)
    }

    async addSpenderToBlacklist(spender: Address): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, true])
    }

    async removeSpenderFromBlacklist(spender: Address): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, false])
    }

    async batchBlacklistSpenders(spenders: Address[], modes: boolean[]): Promise<TransactionParams> {
        const calldata: TransactionParams[] = []
        for (let i = 0; i < spenders.length; i++) {
            if (modes[i]) {
                calldata.push(await this.addSpenderToBlacklist(spenders[i]))
            } else {
                calldata.push(await this.removeSpenderFromBlacklist(spenders[i]))
            }
        }
        return await this.batchTransaction(calldata)
    }
}
