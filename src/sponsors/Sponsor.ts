import { Address } from "viem"
import { PaymasterType } from "./types"
import { addToList, batchOperation, removeFromList, updatePaymasterMode } from "../apis/PaymasterApis"
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

    abstract stake(depositor: Address, sponsor: string, amount: number, options: EnvOption): Promise<TransactionParams>

    abstract unstake(sponsor: Address, receiver: string, amount: number, options: EnvOption): Promise<TransactionParams>

    abstract lockDeposit(): Promise<TransactionParams>

    abstract unlockDepositAfter(blocksToWait: number): Promise<TransactionParams>

    // True if the specified sponsor is in blacklist mode.
    async getListMode(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getListMode", [sponsor], chain)
    }

    async setToBlacklistMode(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await updatePaymasterMode(await chain.getChainId(), { mode: "blacklist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [true])
    }

    async setToWhitelistMode(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await updatePaymasterMode(await chain.getChainId(), { mode: "whitelist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [false])
    }

    async batchTransaction(transactions: TransactionParams[]): Promise<TransactionParams> {
        const batchActionsData: any[] = transactions.map((transaction) => (transaction.data ? transaction.data : "0x"))
        const value = transactions.reduce((acc, transaction) => (transaction.value ? acc + BigInt(transaction.value) : acc), 0n)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "batchActions", [batchActionsData], value)
    }

    async addSpenderToWhitelist(
        sponsor: Address,
        spender: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await addToList(await chain.getChainId(), [spender], "walletsWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, true])
    }

    async removeSpenderFromWhitelist(
        sponsor: Address,
        spender: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await removeFromList(await chain.getChainId(), [spender], "walletsWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, false])
    }

    async batchWhitelistSpenders(
        sponsor: Address,
        spenders: Address[],
        modes: boolean[],
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
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

    async addSpenderToBlacklist(
        sponsor: Address,
        spender: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await addToList(await chain.getChainId(), [spender], "walletsBlackList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, true])
    }

    async removeSpenderFromBlacklist(
        sponsor: Address,
        spender: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await removeFromList(await chain.getChainId(), [spender], "walletsBlackList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, false])
    }

    async batchBlacklistSpenders(
        sponsor: Address,
        spenders: Address[],
        modes: boolean[],
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
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
