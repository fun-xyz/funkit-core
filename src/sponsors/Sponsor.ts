import { Address, Hex } from "viem"
import { PaymasterType } from "./types"
import { ActionData, ActionFunction, ActionResult } from "../actions"
import { addToList, batchOperation, removeFromList, updatePaymasterMode } from "../apis/PaymasterApis"
import { EnvOption } from "../config"
import { Chain, getChainFromData } from "../data"
import { ContractInterface } from "../viem/ContractInterface"

export abstract class Sponsor {
    sponsorAddress?: string
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

    async getSponsorAddress(options: EnvOption = (globalThis as any).globalEnvOption) {
        if (this.sponsorAddress === undefined) {
            const chain = await getChainFromData(options.chain)
            this.sponsorAddress = await chain.getAddress("sponsorAddress")
        }
        return this.sponsorAddress
    }

    async getPaymasterAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await getChainFromData(options.chain)
        const chainId = await chain.getChainId()
        if (!this.paymasterAddress && chainId !== this.chainId) {
            this.paymasterAddress = await chain.getAddress(this.name)
            this.chainId = chainId
        }
        return this.paymasterAddress!
    }

    async encode(data: Hex, options: EnvOption = (globalThis as any).globalEnvOption, value?: bigint): Promise<ActionResult> {
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
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getListMode", [sponsor], chain)
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

            const data = this.contractInterface.encodeData("setListMode", [true])
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
            const data = this.contractInterface.encodeData("setListMode", [false])
            return await this.encode(data, actionData.options)
        }
    }

    batchTransaction(transactions: Function[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: any[] = []
            for (let i = 0; i < transactions.length; i++) {
                calldata.push(await transactions[i](await actionData.wallet.getAddress(), actionData.options))
            }
            const data = this.contractInterface.encodeData("batchActions", [calldata])
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

            const data = this.contractInterface.encodeData("setSpenderWhitelistMode", [spender, true])
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

            const data = this.contractInterface.encodeData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, actionData.options)
        }
    }

    batchWhitelistUsers(users: string[], modes: boolean[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: string[] = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.contractInterface.encodeData("setSpenderWhitelistMode", [users[i], modes[i]]))
            }

            const data = this.contractInterface.encodeData("batchActions", [calldata])

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

            const data = this.contractInterface.encodeData("setSpenderBlacklistMode", [spender, true])
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

            const data = this.contractInterface.encodeData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, actionData.options)
        }
    }

    batchBlacklistUsers(users: string[], modes: boolean[]): ActionFunction {
        return async (actionData: ActionData) => {
            const calldata: string[] = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.contractInterface.encodeData("setSpenderBlacklistMode", [users[i], modes[i]]))
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

            const data = this.contractInterface.encodeData("batchActions", [calldata])
            return await this.encode(data, actionData.options)
        }
    }
}
