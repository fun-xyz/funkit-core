import { Auth } from "../auth"
import { _swap } from "./Swap"
import { RequestUnstakeParams, StakeParams, _stake, _requestUnstake, _finishUnstake } from "./Stake"
import { _transfer, _approve, TransferParams, ApproveParams } from "./Token"
import { EnvOption } from "../config"
import { Chain, UserOp, getChainFromData } from "../data"
import { FunWallet } from "../wallet"
import { SwapParams } from "./Swap"
import { BigNumber, Transaction } from "ethers"
import { isContract } from "../utils"

export interface ActionData {
    wallet: FunWallet
    chain: Chain
    options: EnvOption
}

export interface ExecutionReceipt {
    opHash: string
    txid?: string
    gasUsed: number
    gasUSD: number
}

export abstract class FirstClassActions {
    abstract execute(auth: Auth, transactionFunc: Function, txOptions: EnvOption, estimate: boolean): Promise<ExecutionReceipt | UserOp>
    abstract getAddress(options?: EnvOption): Promise<string>

    async transfer(
        auth: Auth,
        input: TransferParams,
        options: EnvOption = globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(
        auth: Auth,
        input: ApproveParams,
        options: EnvOption = globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(auth: Auth, input: SwapParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async stake(
        auth: Auth,
        input: StakeParams,
        options: EnvOption = globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _stake(input), options, estimate)
    }

    async requestUnstake(auth: Auth, input: RequestUnstakeParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _requestUnstake(input), options, estimate)
    }

    async finishUnstake(auth: Auth, _: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _finishUnstake(), options, estimate)
    }

    async create(auth: Auth, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        } else {
            const chain = await getChainFromData(options.chain)
            return await this.execRawTx(
                auth,
                { to: address, data: "0x", nonce: 0, value: BigNumber.from(0), chainId: Number(chain.id!), gasLimit: BigNumber.from(0) },
                options,
                estimate
            )
        }
    }

    async execRawTx(
        auth: Auth,
        input: Transaction,
        options: EnvOption = globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, genCall(input), options, estimate)
    }
}

export const genCall = (data: Transaction) => {
    return async () => {
        if (!data.value) {
            data.value = BigNumber.from(0)
        }
        if (!data.data) {
            data.data = "0x"
        }
        const gasInfo = {}
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}
