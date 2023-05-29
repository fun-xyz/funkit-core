import { BigNumber, Contract } from "ethers"
import { Interface } from "ethers/lib/utils"
import { getChainFromData } from "../data"
import { EnvOption } from "../config"

export abstract class Sponsor {
    sponsorAddress: string
    interface: Interface
    abi: any
    paymasterAddress?: string
    chainId?: string
    contract?: Contract

    constructor(options: EnvOption = globalEnvOption, abi: any) {
        this.sponsorAddress = options.gasSponsor!.sponsorAddress!
        this.interface = new Interface(abi)
        this.abi = abi
    }

    async getPaymasterAddress(options: EnvOption = globalEnvOption): Promise<string> {
        const chain = await getChainFromData(options.chain)
        const chainId = await chain.getChainId()
        if (!this.paymasterAddress && chainId != this.chainId) {
            this.paymasterAddress = await chain.getAddress("gaslessSponsorAddress")
            this.chainId = chainId
        }
        return this.paymasterAddress!
    }

    async getContract(options: EnvOption = globalEnvOption): Promise<Contract> {
        if (!this.contract) {
            const chain = await getChainFromData(options.chain)
            const provider = await chain.getProvider()
            const paymasterAddress = await this.getPaymasterAddress(options)
            this.contract = new Contract(paymasterAddress, this.abi, provider)
        }
        return this.contract
    }

    async encode(data: any, options: EnvOption = globalEnvOption): Promise<any> {
        const to = await this.getPaymasterAddress(options)
        return { to, data, chain: options.chain }
    }

    async encodeValue(data: any, value: BigNumber, options: EnvOption = globalEnvOption): Promise<any> {
        const to = await this.getPaymasterAddress(options)
        return { to, value, data, chain: options.chain }
    }

    abstract getPaymasterAndData(options: EnvOption): Promise<string>

    abstract stake(walletAddress: string, amount: BigNumber): Function

    abstract unstake(walletAddress: string, amount: BigNumber): Function

    setToBlacklistMode(): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setListMode", [true])
            return await this.encode(data, options)
        }
    }

    setToWhitelistMode(): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setListMode", [false])
            return await this.encode(data, options)
        }
    }

    addSpenderToWhiteList(spender: string): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromWhiteList(spender: string): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    addSpenderToBlackList(spender: string): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromBlackList(spender: string): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, options)
        }
    }
}
