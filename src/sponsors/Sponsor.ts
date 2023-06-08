import { BigNumber, Contract, ContractInterface } from "ethers"
import { Interface } from "ethers/lib/utils"
import { ActionFunction, FirstClassActionResult } from "../actions"
import { EnvOption } from "../config"
import { Chain, getChainFromData } from "../data"
export abstract class Sponsor {
    sponsorAddress: string
    interface: Interface
    abi: ContractInterface
    name: string
    paymasterAddress?: string
    chainId?: string
    contract?: Contract

    constructor(options: EnvOption = (globalThis as any).globalEnvOption, abi: ContractInterface, name: string) {
        this.sponsorAddress = options.gasSponsor!.sponsorAddress!
        if (abi instanceof Interface) {
            this.interface = abi
        } else {
            this.interface = new Interface(abi)
        }
        this.abi = abi
        this.name = name
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

    async encode(
        data: string,
        options: EnvOption = (globalThis as any).globalEnvOption,
        value?: BigNumber
    ): Promise<FirstClassActionResult> {
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

    abstract stake(walletAddress: string, amount: number): Function

    abstract unstake(walletAddress: string, amount: number): Function

    setToBlacklistMode(): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setListMode", [true])
            return await this.encode(data, options)
        }
    }

    setToWhitelistMode(): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setListMode", [false])
            return await this.encode(data, options)
        }
    }

    addSpenderToWhiteList(spender: string): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromWhiteList(spender: string): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    addSpenderToBlackList(spender: string): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromBlackList(spender: string): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, options)
        }
    }
}
