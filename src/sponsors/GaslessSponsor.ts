import { BigNumber } from "ethers"
import { Sponsor } from "./Sponsor"
import { addTransaction } from "../apis/PaymasterApis"
import { GASLESS_PAYMASTER_ABI } from "../common"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export const GASLESS_SPONSOR_TYPE = "gaslessSponsor"

export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, GASLESS_PAYMASTER_ABI, "gaslessSponsorAddress", GASLESS_SPONSOR_TYPE)
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        return (await this.getPaymasterAddress(options)) + this.sponsorAddress.slice(2)
    }

    stake(walletAddress: string, amount: number): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addDepositTo", [walletAddress, amountdec])

            const chain = await getChainFromData(options.chain)
            await addTransaction(
                await chain.getChainId(),
                {
                    action: "stake",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )

            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress: string, amount: number): Function {
        return async (sponsorAddress: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawDepositTo", [walletAddress, amountdec])
            const chain = await getChainFromData(options.chain)
            await addTransaction(
                await chain.getChainId(),
                {
                    action: "unstake",
                    amount,
                    from: sponsorAddress,
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, options)
        }
    }

    async getUnlockBlock(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<number> {
        const contract = await this.getContract(options)
        return await contract.getUnlockBlock(sponsor)
    }

    async getLockState(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const unlockBlock = Number(await this.getUnlockBlock(sponsor, options))
        const chain = await getChainFromData(options.chain)
        const provider = await chain.getProvider()
        const currentBlock = await provider.getBlockNumber()
        if (1 <= unlockBlock && unlockBlock <= currentBlock) {
            return false
        }
        return true
    }

    async getBalance(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        const contract = await this.getContract(options)
        return await contract.getBalance(sponsor)
    }

    lockDeposit(): Function {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("lockDeposit", [])
            return await this.encode(data, options)
        }
    }

    unlockDepositAfter(blocksToWait: number): Function {
        return async (_: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
            const data = this.interface.encodeFunctionData("unlockDepositAfter", [blocksToWait])
            return await this.encode(data, options)
        }
    }

    async getSpenderBlacklistMode(
        spender: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const contract = await this.getContract(options)
        return await contract.getSpenderBlacklistMode(spender, sponsor)
    }

    async getSpenderWhitelistMode(
        spender: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const contract = await this.getContract(options)
        return await contract.getSpenderWhitelistMode(spender, sponsor)
    }
}
