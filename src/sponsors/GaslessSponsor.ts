import { BigNumber } from "ethers"
import { Token } from "../data"
import { EnvOption } from "../config"
import { Sponsor } from "./Sponsor"

const paymasterAbi = require("../abis/GaslessPaymaster.json").abi

export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = globalEnvOption) {
        super(options, paymasterAbi)
    }

    async getPaymasterAndData(options: EnvOption = globalEnvOption): Promise<string> {
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2)
    }

    stake(walletAddress: string, amount: BigNumber): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addDepositTo", [walletAddress, amountdec])
            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress: string, amount: BigNumber): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async getBalance(sponsor: string, options: EnvOption = globalEnvOption): Promise<BigNumber> {
        const contract = await this.getContract(options)
        return await contract.getBalance(sponsor)
    }

    lock(): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockDeposit", [])
            return await this.encode(data, options)
        }
    }

    unlock(num: BigNumber): Function {
        return async (options: EnvOption = globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockDepositAfter", [num])
            return await this.encode(data, options)
        }
    }
}
