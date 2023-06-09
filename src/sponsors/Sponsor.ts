import { BigNumber, Contract, ContractInterface } from "ethers"
import { Interface } from "ethers/lib/utils"
import { PaymasterType } from "./types"
import { ActionData, ActionFunction, ActionResult } from "../actions"
import { addToList, batchOperation, removeFromList, updatePaymasterMode } from "../apis/PaymasterApis"
import { EnvOption } from "../config"
import { Chain, getChainFromData } from "../data"

export abstract class Sponsor {
    sponsorAddress: string
    interface: Interface
    abi: ContractInterface
    name: string
    paymasterType: PaymasterType
    paymasterAddress?: string
    chainId?: string
    contract?: Contract

    constructor(
        options: EnvOption = (globalThis as any).globalEnvOption,
        abi: ContractInterface,
        name: string,
        paymasterType: PaymasterType
    ) {
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

    async encode(data: string, options: EnvOption = (globalThis as any).globalEnvOption, value?: BigNumber): Promise<ActionResult> {
        const to = await this.getPaymasterAddress(options)
        let chain: Chain
        if (typeof options.chain === "string") {
            chain = new Chain({ chainId: options.chain })
        } else {
            chain = options.chain
        }
        if (value) {
            return { data: { to, value, data, chain: chain }, errorData: { location: "" } }
        } else {
            return { data: { to, data, chain: chain }, errorData: { location: "" } }
        }
    }

    abstract getPaymasterAndData(options: EnvOption): Promise<string>

    abstract stake(walletAddress: string, amount: number): ActionFunction

    abstract unstake(walletAddress: string, amount: number): ActionFunction

    abstract lockDeposit(): ActionFunction

    abstract unlockDepositAfter(blocksToWait: number): ActionFunction

    async getListMode(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const contract = await this.getContract(options)
        return await contract.getListMode(sponsor)
    }

    setToBlacklistMode(): ActionFunction {
        return async (actionData: ActionData) => {
            const chain = await getChainFromData(actionData.chain)
            await updatePaymasterMode(
                await chain.getChainId(),
                { mode: "blacklist" },
                this.paymasterType,
                await actionData.wallet.getAddress()
            )

            const data = this.interface.encodeFunctionData("setListMode", [true])
            return await this.encode(data, actionData.options)
        }
    }

    setToWhitelistMode(): ActionFunction {
        return async (actionData: ActionData) => {
            const chain = await getChainFromData(actionData.chain)
            await updatePaymasterMode(
                await chain.getChainId(),
                { mode: "whitelist" },
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            const data = this.interface.encodeFunctionData("setListMode", [false])
            return await this.encode(data, actionData.options)
        }
    }

    batchTransaction(transactions: Function[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: any[] = []
            for (let i = 0; i < transactions.length; i++) {
                calldata.push(await transactions[i](await actionData.wallet.getAddress(), actionData.options))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, actionData.options)
        }
    }

    addSpenderToWhiteList(spender: string): ActionFunction {
        return async (actionData: ActionData) => {
            const chain = await getChainFromData(actionData.chain)
            await addToList(
                await chain.getChainId(),
                [spender],
                "walletsWhiteList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )

            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, actionData.options)
        }
    }

    removeSpenderFromWhiteList(spender: string): ActionFunction {
        return async (actionData: ActionData) => {
            const chain = await getChainFromData(actionData.chain)
            await removeFromList(
                await chain.getChainId(),
                [spender],
                "walletsWhiteList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )

            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, actionData.options)
        }
    }

    batchWhitelistUsers(users: string[], modes: boolean[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: string[] = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderWhitelistMode", [users[i], modes[i]]))
            }

            const data = this.interface.encodeFunctionData("batchActions", [calldata])

            const chain = await getChainFromData(actionData.chain)
            batchOperation(
                await chain.getChainId(),
                users,
                modes,
                "walletsWhiteList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )
            return await this.encode(data, actionData.options)
        }
    }

    addSpenderToBlackList(spender: string): ActionFunction {
        return async (actionData: ActionData) => {
            const chain = await getChainFromData(actionData.chain)
            await addToList(
                await chain.getChainId(),
                [spender],
                "walletsBlackList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )

            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, actionData.options)
        }
    }

    removeSpenderFromBlackList(spender: string): ActionFunction {
        return async (actionData: ActionData) => {
            const chain = await getChainFromData(actionData.chain)
            await removeFromList(
                await chain.getChainId(),
                [spender],
                "walletsBlackList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )

            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, actionData.options)
        }
    }

    batchBlacklistUsers(users: string[], modes: boolean[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: string[] = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderBlacklistMode", [users[i], modes[i]]))
            }

            const chain = await getChainFromData(actionData.chain)
            batchOperation(
                await chain.getChainId(),
                users,
                modes,
                "walletsBlackList",
                this.paymasterType,
                await actionData.wallet.getAddress()
            )

            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, actionData.options)
        }
    }
}
