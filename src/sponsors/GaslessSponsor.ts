import { Address, concat } from "viem"
import { Sponsor } from "./Sponsor"
import { PaymasterType } from "./types"
import { addTransaction } from "../apis/PaymasterApis"
import { GASLESS_PAYMASTER_CONTRACT_INTERFACE, GASLESS_SPONSOR_SUPPORT_CHAINS, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain, Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"
export class GaslessSponsor extends Sponsor {
    constructor(options: EnvOption = (globalThis as any).globalEnvOption) {
        super(options, GASLESS_PAYMASTER_CONTRACT_INTERFACE, "gaslessPaymasterAddress", PaymasterType.GaslessSponsor)
    }

    async getSponsorAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        if (!this.sponsorAddress) {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            if (GASLESS_SPONSOR_SUPPORT_CHAINS.includes(await chain.getChainId())) {
                this.sponsorAddress = await chain.getAddress("funGaslessSponsorAddress")
            } else {
                throw new InvalidParameterError(
                    ErrorCode.MissingParameter,
                    "sponsorAddress is missing and the chain you are working with does not support default fun sponsor",
                    "GaslessSponsor.getSponsorAddress",
                    { gaslessSponsorSupportChains: GASLESS_SPONSOR_SUPPORT_CHAINS, chain: await chain.getChainId() },
                    "Provide correct sponsorAddress.",
                    "https://docs.fun.xyz"
                )
            }
        }
        return this.sponsorAddress
    }

    async getPaymasterAndData(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const paymasterAddress = await this.getPaymasterAddress(options)
        const sponsor = await this.getSponsorAddress(options)
        return concat([paymasterAddress, sponsor])
    }

    async stake(
        sponsor: Address,
        walletAddress: string,
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
                from: sponsor,
                to: await this.getPaymasterAddress(options),
                token: "eth"
            },
            this.paymasterType,
            walletAddress
        )
        return this.contractInterface.encodeTransactionParams(
            await this.getPaymasterAddress(),
            "addDepositTo",
            [walletAddress, amountdec],
            BigInt(amountdec)
        )
    }

    async unstake(
        sponsor: Address,
        walletAddress: string,
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
            walletAddress
        )
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "withdrawDepositTo", [
            walletAddress,
            amountdec
        ])
    }

    async getUnlockBlock(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<number> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getUnlockBlock", [sponsor], chain)
    }

    async getLockState(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const unlockBlock = Number(await this.getUnlockBlock(sponsor, options))
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const client = await chain.getClient()
        const currentBlock = await client.getBlockNumber()
        return unlockBlock === 0 || unlockBlock > currentBlock
    }

    async getBalance(sponsor: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
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
        spender: string,
        sponsor: string,
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
        spender: string,
        sponsor: string,
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
