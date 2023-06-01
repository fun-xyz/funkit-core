import { Auth } from "../auth"
import { _swap } from "./Swap"
import { StakeParams, _stake } from "./Stake"
import { _transfer, _approve, TransferParams, ApproveParams } from "./Token"
import { EnvOption } from "../config"
import { Chain, UserOp, CallInfo } from "../data"
import { FunWallet } from "../wallet"
import { SwapParams } from "./Swap"
import { isContract } from "../utils"

export type ActionData = {
    wallet: FunWallet
    chain: Chain
    options: EnvOption
}

export type ExecutionReceipt = {
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
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(
        auth: Auth,
        input: ApproveParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(
        auth: Auth,
        input: SwapParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async stake(
        auth: Auth,
        input: StakeParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _stake(input), options, estimate)
    }

    async create(
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        } else {
            return await this.execRawTx(auth, { to: address, data: "0x" }, options, estimate)
        }
    }

    async execRawTx(
        auth: Auth,
        input: CallInfo,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, genCall(input), options, estimate)
    }
}

export const genCall = (data: CallInfo) => {
    return async () => {
        const gasInfo = {}
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}
