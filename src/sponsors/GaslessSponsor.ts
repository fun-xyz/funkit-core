import { Address, concat } from "viem"
import { Sponsor } from "./Sponsor"
import { PaymasterType } from "./types"
import { addTransaction } from "../apis/PaymasterApis"
import { GASLESS_PAYMASTER_CONTRACT_INTERFACE, GASLESS_SPONSOR_SUPPORT_CHAINS, TransactionParams } from "../common"
import { GlobalEnvOption } from "../config"
import { Chain, Token } from "../data"
import { ErrorCode, ResourceNotFoundError } from "../errors"
export class GaslessSponsor extends Sponsor {
    override options: GlobalEnvOption
    constructor(options: GlobalEnvOption) {
        super(options, GASLESS_PAYMASTER_CONTRACT_INTERFACE, "gaslessPaymasterAddress", PaymasterType.GaslessSponsor)
        this.options = options
    }

    async getFunSponsorAddress(options: GlobalEnvOption = this.options): Promise<Address> {
        if (!this.sponsorAddress) {
            const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
            if (GASLESS_SPONSOR_SUPPORT_CHAINS.includes(chain.getChainId())) {
                this.sponsorAddress = chain.getAddress("funGaslessSponsorAddress")
            } else {
                throw new ResourceNotFoundError(
                    ErrorCode.MissingParameter,
                    "The network you are working with does not support gasless Fun Sponsor. You will need to run and manage your own gasless sponsor.",
                    { gaslessSponsorSupportChains: GASLESS_SPONSOR_SUPPORT_CHAINS, chain: await chain.getChainId() },
                    "Manage your own gasless sponsor, or use a supported network.",
                    "https://docs.fun.xyz"
                )
            }
        }
        return this.sponsorAddress
    }

    async getPaymasterAndData(options: GlobalEnvOption = this.options): Promise<string> {
        const paymasterAddress = await this.getPaymasterAddress(options)
        const sponsor = await this.getFunSponsorAddress(options)
        return concat([paymasterAddress, sponsor])
    }

    async stake(depositor: Address, sponsor: Address, amount: number, options: GlobalEnvOption = this.options): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const amountdec = await Token.getDecimalAmount("eth", amount, chain, options.apiKey)
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
        options: GlobalEnvOption = this.options
    ): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)

        const amountdec = await Token.getDecimalAmount("eth", amount, chain, options.apiKey)

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

    async getUnlockBlock(sponsor: Address, options: GlobalEnvOption = this.options): Promise<number> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getUnlockBlock", [sponsor], chain)
    }

    async getLockState(sponsor: Address, options: GlobalEnvOption = this.options): Promise<boolean> {
        const unlockBlock = Number(await this.getUnlockBlock(sponsor, options))
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const client = await chain.getClient()
        const currentBlock = await client.getBlockNumber()
        return unlockBlock === 0 || unlockBlock > currentBlock
    }

    async getBalance(sponsor: Address, options: GlobalEnvOption = this.options): Promise<bigint> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(await this.getPaymasterAddress(options), "getBalance", [sponsor], chain)
    }

    async lockDeposit(): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "lockDeposit", [])
    }

    async unlockDepositAfter(blocksToWait: number): Promise<TransactionParams> {
        return this.contractInterface.encodeTransactionParams(await this.getPaymasterAddress(), "unlockDepositAfter", [blocksToWait])
    }

    async getSpenderBlacklistMode(spender: Address, sponsor: Address, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderBlacklistMode",
            [spender, sponsor],
            chain
        )
    }

    async getSpenderWhitelistMode(spender: Address, sponsor: Address, options: GlobalEnvOption = this.options): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await this.contractInterface.readFromChain(
            await this.getPaymasterAddress(options),
            "getSpenderWhitelistMode",
            [spender, sponsor],
            chain
        )
    }

    // static async getPaymasterAddress(options: GlobalEnvOption = this.options): Promise<Address> {
    //     const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
    //     return await chain.getAddress(this.name)
    // }
}
