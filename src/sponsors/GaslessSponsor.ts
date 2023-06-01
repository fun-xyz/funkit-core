import { BigNumber } from "ethers"
import { Sponsor } from "./Sponsor"
import paymaster from "../abis/GaslessPaymaster.json"
import { EnvOption } from "../config"
import { Token } from "../data"

export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, paymaster.abi, "gaslessSponsorAddress")
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2)
    }

    stake(walletAddress: string, amount: number): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addDepositTo", [walletAddress, amountdec])
            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress: string, amount: number): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async getBalance(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        const contract = await this.getContract(options)
        return await contract.getBalance(sponsor)
    }

    lock(): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockDeposit", [])
            return await this.encode(data, options)
        }
    }

    unlock(num: BigNumber): Function {
        return async (options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockDepositAfter", [num])
            return await this.encode(data, options)
        }
    }
}
