import { Sponsor } from "./Sponsor"
import { PaymasterType } from "./types"
import { ActionData, ActionFunction } from "../actions"
import { GASLESS_PAYMASTER_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { Token, getChainFromData } from "../data"

export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, GASLESS_PAYMASTER_CONTRACT_INTERFACE, "gaslessSponsorAddress", PaymasterType.GaslessSponsor)
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        return (await this.getPaymasterAddress(options)) + (await this.getSponsorAddress(options)).slice(2)
    }

    stake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.contractInterface.encodeData("addDepositTo", [walletAddress, amountdec])

            // const chain = await getChainFromData(actionData.chain)
            // await addTransaction(
            //     await chain.getChainId(),
            //     {
            //         action: "stake",
            //         amount,
            //         from: await actionData.wallet.getAddress(),
            //         timestamp: Date.now(),
            //         to: await this.getPaymasterAddress(actionData.options),
            //         token: "eth"
            //     },
            //     this.paymasterType,
            //     walletAddress
            // )

            return await this.encode(data, actionData.options, amountdec)
        }
    }

    unstake(walletAddress: string, amount: number): ActionFunction {
        return async (actionData: ActionData) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, actionData.options)
            const data = this.contractInterface.encodeData("withdrawDepositTo", [walletAddress, amountdec])
            // const chain = await getChainFromData(actionData.chain)
            // await addTransaction(
            //     await chain.getChainId(),
            //     {
            //         action: "unstake",
            //         amount,
            //         from: await actionData.wallet.getAddress(),
            //         timestamp: Date.now(),
            //         to: await this.getPaymasterAddress(actionData.options),
            //         token: "eth"
            //     },
            //     this.paymasterType,
            //     walletAddress
            // )
            return await this.encode(data, actionData.options)
        }
    }

    async getUnlockBlock(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<number> {
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getUnlockBlock", [sponsor], chain)
    }

    async getLockState(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const unlockBlock = Number(await this.getUnlockBlock(sponsor, options))
        const chain = await getChainFromData(options.chain)
        const client = await chain.getClient()
        const currentBlock = await client.getBlockNumber()
        return unlockBlock === 0 || unlockBlock > currentBlock
    }

    async getBalance(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getBalance", [sponsor], chain)
    }

    lockDeposit(): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.contractInterface.encodeData("lockDeposit", [])
            return await this.encode(data, actionData.options)
        }
    }

    unlockDepositAfter(blocksToWait: number): ActionFunction {
        return async (actionData: ActionData) => {
            const data = this.contractInterface.encodeData("unlockDepositAfter", [blocksToWait])
            return await this.encode(data, actionData.options)
        }
    }

    async getSpenderBlacklistMode(
        spender: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderBlacklistMode",
            [spender, sponsor],
            chain
        )
    }

    async getSpenderWhitelistMode(
        spender: string,
        sponsor: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await getChainFromData(options.chain)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderWhitelistMode",
            [spender, sponsor],
            chain
        )
    }
}
