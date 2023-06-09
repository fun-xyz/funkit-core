import { Sponsor } from "./Sponsor"
import { ActionFunction } from "../actions"
import { gaslessPaymasterContractInterface } from "../common"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, gaslessPaymasterContractInterface, "gaslessSponsorAddress")
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2)
    }

    stake(walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.contractInterface.encodeData("addDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options, amountdec)
        }
    }

    unstake(walletAddress: string, amount: number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.contractInterface.encodeData("withdrawDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async getBalance(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(options.chain)
        return this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getBalance", [sponsor], chain)
    }

    lock(): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("lockDeposit", [])
            return await this.encode(data, options)
        }
    }

    unlock(num: bigint | number): ActionFunction {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.contractInterface.encodeData("unlockDepositAfter", [num])
            return await this.encode(data, options)
        }
    }
}
