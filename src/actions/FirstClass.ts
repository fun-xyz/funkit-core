import { Address } from "viem"
import { _finishUnstake, _requestUnstake, _stake } from "./Stake"
import { _swap } from "./Swap"
import { _approve, _transfer } from "./Token"
import { ApproveParams, FinishUnstakeParams, RequestUnstakeParams, StakeParams, SwapParams, TransferParams } from "./types"
import { Auth } from "../auth"
import { ExecutionReceipt, TransactionData } from "../common/types"
import { EnvOption } from "../config"
import { UserOp, getChainFromData } from "../data"
import { Helper, ParameterFormatError } from "../errors"
import { isContract } from "../utils"

const isRequestUnstakeParams = (input: any) => {
    return input.amounts !== undefined
}
const isFinishUnstakeParams = (input: any) => {
    return input.recipient !== undefined
}

export abstract class FirstClassActions {
    abstract execute(
        auth: Auth,
        transactionFunc: Function,
        txOptions: EnvOption,
        estimate: boolean
    ): Promise<ExecutionReceipt | UserOp | bigint>
    abstract getAddress(options?: EnvOption): Promise<Address>

    async transfer(
        auth: Auth,
        input: TransferParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(
        auth: Auth,
        input: ApproveParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(
        auth: Auth,
        input: SwapParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async stake(
        auth: Auth,
        input: StakeParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        return await this.execute(auth, _stake(input), options, estimate)
    }

    async unstake(
        auth: Auth,
        input: RequestUnstakeParams | FinishUnstakeParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        if (isRequestUnstakeParams(input)) {
            return await this.execute(auth, _requestUnstake(input as RequestUnstakeParams), options, estimate)
        } else if (isFinishUnstakeParams(input)) {
            return await this.execute(auth, _finishUnstake(input as FinishUnstakeParams), options, estimate)
        }
        const helper = new Helper("Invalid parameters", input, "Must be of type RequestUnstakeParams or FinishUnstakeParams")
        throw new ParameterFormatError("FirstClass.unstake", helper)
    }

    async create(
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        const address = await this.getAddress()
        const chain = await getChainFromData(options.chain)

        if (await isContract(address, await chain.getClient())) {
            throw new Error("Wallet already exists as contract.")
        } else {
            return await this.execRawTx(auth, { to: address, data: "0x" }, options, estimate)
        }
    }

    async execRawTx(
        auth: Auth,
        input: TransactionData,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        return await this.execute(auth, genCall(input), options, estimate)
    }
}

export const genCall = (data: TransactionData) => {
    return async () => {
        if (!data.value) {
            data.value = 0n
        }
        if (!data.data) {
            data.data = "0x"
        }
        const gasInfo = {}
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}
