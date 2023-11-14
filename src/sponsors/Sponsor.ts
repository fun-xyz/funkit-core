import { Address } from "viem"
import { PaymasterType } from "./types"
import { addToList, batchOperation, removeFromList, updatePaymasterMode } from "../apis/PaymasterApis"
import { TransactionParams } from "../common"
import { GlobalEnvOption } from "../config"
import { Chain } from "../data"
import { ContractInterface } from "../viem/ContractInterface"

export abstract class Sponsor {
    sponsorAddress?: Address
    contractInterface: ContractInterface
    name: string
    paymasterAddress?: Address
    paymasterType: PaymasterType
    chainId?: string
    options: GlobalEnvOption

    constructor(options: GlobalEnvOption, contractInterface: ContractInterface, name: string, paymasterType: PaymasterType) {
        if (options.gasSponsor !== undefined && options.gasSponsor.sponsorAddress !== undefined) {
            this.sponsorAddress = options.gasSponsor.sponsorAddress
        }
        this.contractInterface = contractInterface
        this.name = name
        this.paymasterType = paymasterType
        this.options = options
    }

    async getPaymasterAddress(options: GlobalEnvOption = this.options): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const chainId = await chain.getChainId()
        if (!this.paymasterAddress && chainId !== this.chainId) {
            this.paymasterAddress = await chain.getAddress(this.name)
            this.chainId = chainId
        }
        return this.paymasterAddress!
    }

    abstract getPaymasterAndData(options: GlobalEnvOption): Promise<string>

    abstract stake(depositor: Address, sponsor: string, amount: number, options: GlobalEnvOption): Promise<TransactionParams>

    abstract unstake(sponsor: Address, receiver: string, amount: number, options: GlobalEnvOption): Promise<TransactionParams>

    abstract lockDeposit(): Promise<TransactionParams>

    abstract unlockDepositAfter(blocksToWait: number): Promise<TransactionParams>

    /** True if the specified sponsor is in blacklist mode. **/
    async getListMode(sponsor: string, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getListMode", [sponsor], chain)
    }

    async setToBlacklistMode(sponsor: Address, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        await updatePaymasterMode(await chain.getChainId(), { mode: "blacklist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [true])
    }

    async setToWhitelistMode(sponsor: Address, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        await updatePaymasterMode(await chain.getChainId(), { mode: "whitelist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [false])
    }

    async batchTransaction(transactions: TransactionParams[]): Promise<TransactionParams> {
        const batchActionsData: any[] = transactions.map((transaction) => (transaction.data ? transaction.data : "0x"))
        const value = transactions.reduce((acc, transaction) => (transaction.value ? acc + BigInt(transaction.value) : acc), 0n)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "batchActions", [batchActionsData], value)
    }

    async addSpenderToWhitelist(sponsor: Address, spender: Address, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        await addToList(await chain.getChainId(), [spender], "walletsWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, true])
    }

    async removeSpenderFromWhitelist(
        sponsor: Address,
        spender: Address,
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        await removeFromList(chain.getChainId(), [spender], "walletsWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, false])
    }

    async batchWhitelistSpenders(
        sponsor: Address,
        spenders: Address[],
        modes: boolean[],
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const calldata: TransactionParams[] = []
        for (let i = 0; i < spenders.length; i++) {
            if (modes[i]) {
                calldata.push(await this.addSpenderToWhitelist(sponsor, spenders[i], options))
            } else {
                calldata.push(await this.removeSpenderFromWhitelist(sponsor, spenders[i], options))
            }
        }
        batchOperation(await chain.getChainId(), spenders, modes, "walletsWhiteList", this.paymasterType, sponsor)
        return await this.batchTransaction(calldata)
    }

    async addSpenderToBlacklist(sponsor: Address, spender: Address, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        await addToList(await chain.getChainId(), [spender], "walletsBlackList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, true])
    }

    async removeSpenderFromBlacklist(
        sponsor: Address,
        spender: Address,
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        await removeFromList(await chain.getChainId(), [spender], "walletsBlackList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, false])
    }

    async batchBlacklistSpenders(
        sponsor: Address,
        spenders: Address[],
        modes: boolean[],
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const calldata: TransactionParams[] = []
        for (let i = 0; i < spenders.length; i++) {
            if (modes[i]) {
                calldata.push(await this.addSpenderToBlacklist(sponsor, spenders[i], options))
            } else {
                calldata.push(await this.removeSpenderFromBlacklist(sponsor, spenders[i], options))
            }
        }
        batchOperation(await chain.getChainId(), spenders, modes, "walletsBlackList", this.paymasterType, sponsor)
        return await this.batchTransaction(calldata)
    }
}
