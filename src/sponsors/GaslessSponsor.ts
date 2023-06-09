import { BigNumber } from "ethers"
import { Sponsor } from "./Sponsor"
import { ActionData, ActionFunction } from "../actions"
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

    stake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.interface.encodeFunctionData("addDepositTo", [walletAddress, amountdec])

            const chain = await getChainFromData(actionData.chain)
            await addTransaction(
                await chain.getChainId(),
                {
                    action: "stake",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )

            return await this.encode(data, actionData.options, amountdec)
        }
    }

    unstake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.interface.encodeFunctionData("withdrawDepositTo", [walletAddress, amountdec])
            const chain = await getChainFromData(actionData.chain)
            await addTransaction(
                await chain.getChainId(),
                {
                    action: "unstake",
                    amount,
                    from: await actionData.wallet.getAddress(),
                    timestamp: Date.now(),
                    to: await this.getPaymasterAddress(actionData.options),
                    token: "eth"
                },
                this.paymasterType,
                walletAddress
            )
            return await this.encode(data, actionData.options)
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

    lockDeposit(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("lockDeposit", [])
            return await this.encode(data, actionData.options)
        }
    }

    unlockDepositAfter(blocksToWait: number): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.interface.encodeFunctionData("unlockDepositAfter", [blocksToWait])
            return await this.encode(data, actionData.options)
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
