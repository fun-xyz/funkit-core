import { Auth } from "../auth"
import { isContract } from "../utils"
import { _swap } from "./Swap"
import { _finishUnstake, _requestUnstake, _stake } from "./Stake"
import { _transfer, _approve } from "./Token"
import { EnvOption } from "../config"
import { Chain, UserOp } from "../data"
import { FunWallet } from "../wallet"
import { BigNumber } from "ethers"
import { ApproveParams, TransferParams } from "./Token"
import { SwapParams } from "./Swap"
import { StakeParams, RequestUnstakeParams } from "./Stake"

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

    async transfer(auth: Auth, input: TransferParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(auth: Auth, input: ApproveParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(auth: Auth, input: SwapParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async stake(auth: Auth, input: StakeParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _stake(input), options, estimate)
    }

    async requestUnstake(auth: Auth, input: RequestUnstakeParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _requestUnstake(input), options, estimate)
    }

    async finishUnstake(auth: Auth, input: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _finishUnstake(), options, estimate)
    }

    async create(auth: Auth, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        } else {
            return await this.execRawTx(auth, { to: address, data: "0x", value: BigNumber.from(0) }, options, estimate)
        }
    }

    async execRawTx(auth: Auth, input: GenCallParams, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, genCall(input), options, estimate)
    }
}

export interface GenCallParams {
    to: string
    data: string
    value: BigNumber
}

export const genCall = (data: GenCallParams) => {
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
