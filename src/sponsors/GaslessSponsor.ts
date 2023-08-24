import { Address, concat } from "viem"
import { Sponsor } from "./Sponsor"
import { PaymasterType } from "./types"
import { addTransaction } from "../apis/PaymasterApis"
import { GASLESS_PAYMASTER_CONTRACT_INTERFACE, GASLESS_SPONSOR_SUPPORT_CHAINS, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain, Token } from "../data"
import { ErrorCode, ResourceNotFoundError } from "../errors"
export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, GASLESS_PAYMASTER_CONTRACT_INTERFACE, "gaslessPaymasterAddress", PaymasterType.GaslessSponsor)
    }

    async getFunSponsorAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        if (!this.sponsorAddress) {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            if (GASLESS_SPONSOR_SUPPORT_CHAINS.includes(await chain.getChainId())) {
                this.sponsorAddress = await chain.getAddress("funGaslessSponsorAddress")
            } else {
                throw new ResourceNotFoundError(
                    ErrorCode.MissingParameter,
                    "The network you are working with does not support gasless Fun Sponsor. You will need to run and manage your own gasless sponsor.",
                    "GaslessSponsor.getFunSponsorAddress",
                    { gaslessSponsorSupportChains: GASLESS_SPONSOR_SUPPORT_CHAINS, chain: await chain.getChainId() },
                    "Manage your own gasless sponsor, or use a supported network.",
                    "https://docs.fun.xyz"
                )
            }
        }
        return this.sponsorAddress
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const paymasterAddress = await this.getPaymasterAddress(options)
        const sponsor = await this.getFunSponsorAddress(options)
        return concat([paymasterAddress, sponsor])
    }

    async stake(
        depositor: Address,
        sponsor: Address,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const amountdec = await Token.getDecimalAmount("eth", amount, options)
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await addTransaction(
            await chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "stake",
                amount,
                from: depositor,
                to: await this.getPaymasterAddress(options),
                token: "eth"
            },
            this.paymasterType,
            sponsor
        )
        return this.contractInterface.encodeTransactionParams(
            await this.getPaymasterAddress(),
            "addDepositTo",
            [sponsor, amountdec],
            BigInt(amountdec)
        )
    }

    async unstake(
        sponsor: Address,
        receiver: Address,
        amount: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionParams> {
        const amountdec = await Token.getDecimalAmount("eth", amount, options)

        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        await addTransaction(
            await chain.getChainId(),
            Date.now(),
            "0x",
            {
                action: "unstake",
                amount,
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token: "eth"
            },
            this.paymasterType,
            receiver
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawDepositTo", [receiver, amountdec])
    }

    async getUnlockBlock(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<number> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getUnlockBlock", [sponsor], chain)
    }

    async getLockState(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const unlockBlock = Number(await this.getUnlockBlock(sponsor, options))
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const client = await chain.getClient()
        const currentBlock = await client.getBlockNumber()
        return unlockBlock === 0 || unlockBlock > currentBlock
    }

    async getBalance(sponsor: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getBalance", [sponsor], chain)
    }

    async lockDeposit(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "lockDeposit", [])
    }

    async unlockDepositAfter(blocksToWait: number): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "unlockDepositAfter", [blocksToWait])
    }

    async getSpenderBlacklistMode(
        spender: Address,
        sponsor: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderBlacklistMode",
            [spender, sponsor],
            chain
        )
    }

    async getSpenderWhitelistMode(
        spender: Address,
        sponsor: Address,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderWhitelistMode",
            [spender, sponsor],
            chain
        )
    }

    static async getPaymasterAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await chain.getAddress(this.name)
    }
}
