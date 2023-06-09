import { Address } from "viem"
import { EnvOption } from "../config"
import { Chain, getChainFromData  } from "../data"
import { ContractInterface } from "../viem/ContractInterface"
import { FirstClassActionResult } from "../actions"

export abstract class Sponsor {
    sponsorAddress: string
    contractInterface: ContractInterface
    name: string
    paymasterAddress?: Address
    chainId?: string

    constructor(options: EnvOption = (globalThis as any).globalEnvOption, contractInterface: ContractInterface, name: string) {
        this.sponsorAddress = options.gasSponsor!.sponsorAddress!
        this.contractInterface = contractInterface
        this.name = name
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

    setToBlacklistMode(): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("setListMode", [true])
            return await this.encode(data, options)
        }
    }

    setToWhitelistMode(): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("setListMode", [false])
            return await this.encode(data, options)
        }
    }

    addSpenderToWhiteList(spender: string): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromWhiteList(spender: string): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    addSpenderToBlackList(spender: string): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromBlackList(spender: string): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, options)
        }
    }
}
