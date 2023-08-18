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

    abstract stake(sponsor: Address, walletAddress: string, amount: number, options: EnvOption): Promise<TransactionParams>

    abstract unstake(sponsor: Address, walletAddress: string, amount: number, options: EnvOption): Promise<TransactionParams>

    abstract lockDeposit(): Promise<TransactionParams>

    abstract unlockDepositAfter(blocksToWait: number): Promise<TransactionParams>

    async getListMode(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getListMode", [sponsor], chain)
    }

    async setToBlacklistMode(chainId: number, sponsor: Address): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: chainId })
        await updatePaymasterMode(await chain.getChainId(), { mode: "blacklist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [true])
    }

    async setToWhitelistMode(chainId: number, sponsor: Address): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: chainId })
        await updatePaymasterMode(await chain.getChainId(), { mode: "whitelist" }, this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setListMode", [false])
    }

    async batchTransaction(transactions: TransactionParams[]): Promise<TransactionParams> {
        const batchActionsData: any[] = transactions.map((transaction) => (transaction.data ? transaction.data : "0x"))
        const value = transactions.reduce((acc, transaction) => (transaction.value ? acc + BigInt(transaction.value) : acc), 0n)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "batchActions", [batchActionsData], value)
    }

    async addSpenderToWhiteList(chainId: number, sponsor: Address, spender: string): Promise<TransactionParams> {
        await addToList(chainId.toString(), [spender], "walletsWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, true])
    }

    async removeSpenderFromWhiteList(chainId: number, sponsor: Address, spender: string): Promise<TransactionParams> {
        await removeFromList(chainId.toString(), [spender], "walletsWhiteList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderWhitelistMode", [spender, false])
    }

    async batchWhitelistUsers(chainId: number, sponsor: Address, users: string[], modes: boolean[]): Promise<TransactionParams> {
        const calldata: TransactionParams[] = []
        for (let i = 0; i < users.length; i++) {
            if (modes[i]) {
                calldata.push(await this.addSpenderToWhiteList(chainId, sponsor, users[i]))
            } else {
                calldata.push(await this.removeSpenderFromWhiteList(chainId, sponsor, users[i]))
            }
        }
        batchOperation(chainId.toString(), users, modes, "walletsWhiteList", this.paymasterType, sponsor)
        return await this.batchTransaction(calldata)
    }

    async addSpenderToBlackList(chainId: number, sponsor: Address, spender: string): Promise<TransactionParams> {
        await addToList(chainId.toString(), [spender], "walletsBlackList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, true])
    }

    async removeSpenderFromBlackList(chainId: number, sponsor: Address, spender: string): Promise<TransactionParams> {
        await removeFromList(chainId.toString(), [spender], "walletsBlackList", this.paymasterType, sponsor)
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "setSpenderBlacklistMode", [spender, false])
    }

    async batchBlacklistUsers(chainId: number, sponsor: Address, users: string[], modes: boolean[]): Promise<TransactionParams> {
        const calldata: TransactionParams[] = []
        for (let i = 0; i < users.length; i++) {
            if (modes[i]) {
                calldata.push(await this.addSpenderToBlackList(chainId, sponsor, users[i]))
            } else {
                calldata.push(await this.removeSpenderFromBlackList(chainId, sponsor, users[i]))
            }
        }
        batchOperation(chainId.toString(), users, modes, "walletsBlackList", this.paymasterType, sponsor)
        return await this.batchTransaction(calldata)
    }
}
