import { BigNumber, Contract, ContractInterface } from "ethers"
import { Interface } from "ethers/lib/utils"
import { addToList, batchOperation, removeFromList, updatePaymasterMode } from "../apis/PaymasterApis"
import { TransactionData } from "../common"
import { EnvOption } from "../config"
import { Chain, getChainFromData } from "../data"

export const BASE_SPONSOR_TYPE = "baseSponsor"

export abstract class Sponsor {
    sponsorAddress: string
    interface: Interface
    abi: ContractInterface
    name: string
    paymasterType: string
    paymasterAddress?: string
    chainId?: string
    contract?: Contract

    constructor(options: EnvOption = (globalThis as any).globalEnvOption, abi: ContractInterface, name: string, paymasterType: string) {
        this.sponsorAddress = options.gasSponsor!.sponsorAddress!
        if (abi instanceof Interface) {
            this.interface = abi
        } else {
            this.interface = new Interface(abi)
        }
        this.abi = abi
        this.name = name
        this.paymasterType = paymasterType
    }

    async getPaymasterAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const chain = await getChainFromData(options.chain)
        const chainId = await chain.getChainId()
        if (!this.paymasterAddress && chainId !== this.chainId) {
            this.paymasterAddress = await chain.getAddress(this.name)
            this.chainId = chainId
        }
        return this.paymasterAddress!
    }

    async getContract(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Contract> {
        if (!this.contract) {
            const chain = await getChainFromData(options.chain)
            const provider = await chain.getProvider()
            const paymasterAddress = await this.getPaymasterAddress(options)
            this.contract = new Contract(paymasterAddress, this.abi, provider)
        }
        return this.contract
    }

    async encode(data: string, options: EnvOption = (globalThis as any).globalEnvOption, value?: BigNumber): Promise<TransactionData> {
        const to = await this.getPaymasterAddress(options)
        let chain: Chain
        if (typeof options.chain === "string") {
            chain = new Chain({ chainId: options.chain })
        } else {
            chain = options.chain
        }
        if (value) {
            return { to, value, data, chain: chain }
        } else {
            return { to, data, chain: chain }
        }
    }

    abstract getPaymasterAndData(options: EnvOption): Promise<string>

    abstract stake(walletAddress: string, amount: number): Function

    abstract unstake(walletAddress: string, amount: number): Function

    abstract lockDeposit(): Function

    abstract unlockDepositAfter(blocksToWait: number): Function

    async getListMode(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const contract = await this.getContract(options)
        return await contract.getListMode(sponsor)
    }

    setToBlacklistMode(): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const chain = await getChainFromData(options.chain)
            await updatePaymasterMode(await chain.getChainId(), { mode: "blacklist" }, this.paymasterType, sponsorAddress)

            const data = this.interface.encodeFunctionData("setListMode", [true])
            return await this.encode(data, options)
        }
    }

    setToWhitelistMode(): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const chain = await getChainFromData(options.chain)
            await updatePaymasterMode(await chain.getChainId(), { mode: "whitelist" }, this.paymasterType, sponsorAddress)
            const data = this.interface.encodeFunctionData("setListMode", [false])
            return await this.encode(data, options)
        }
    }

    batchTransaction(transactions: Function[]): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const calldata: any[] = []
            for (let i = 0; i < transactions.length; i++) {
                calldata.push(await transactions[i](sponsorAddress, options))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, options)
        }
    }

    addSpenderToWhiteList(spender: string): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const chain = await getChainFromData(options.chain)
            await addToList(await chain.getChainId(), [spender], "walletsWhiteList", this.paymasterType, sponsorAddress)

            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromWhiteList(spender: string): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const chain = await getChainFromData(options.chain)
            await removeFromList(await chain.getChainId(), [spender], "walletsWhiteList", this.paymasterType, sponsorAddress)

            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    batchWhitelistUsers(users: string[], modes: boolean[]): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const calldata: string[] = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderWhitelistMode", [users[i], modes[i]]))
            }

            const data = this.interface.encodeFunctionData("batchActions", [calldata])

            const chain = await getChainFromData(options.chain)
            batchOperation(await chain.getChainId(), users, modes, "walletsWhiteList", this.paymasterType, sponsorAddress)
            return await this.encode(data, options)
        }
    }

    addSpenderToBlackList(spender: string): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const chain = await getChainFromData(options.chain)
            await addToList(await chain.getChainId(), [spender], "walletsBlackList", this.paymasterType, sponsorAddress)

            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromBlackList(spender: string): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const chain = await getChainFromData(options.chain)
            await removeFromList(await chain.getChainId(), [spender], "walletsBlackList", this.paymasterType, sponsorAddress)

            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    batchBlacklistUsers(users: string[], modes: boolean[]): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const calldata: string[] = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderBlacklistMode", [users[i], modes[i]]))
            }

            const chain = await getChainFromData(options.chain)
            batchOperation(await chain.getChainId(), users, modes, "walletsBlackList", this.paymasterType, sponsorAddress)

            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, options)
        }
    }
}
