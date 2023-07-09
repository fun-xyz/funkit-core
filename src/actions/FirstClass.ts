import { Address } from "viem"
import { _swap } from "./Swap"
import { SwapParams } from "./types"
import { Auth } from "../auth"
import { ExecutionReceipt, TransactionData } from "../common/types"
import { EnvOption } from "../config"
import { UserOp, getChainFromData } from "../data"
import { isContract } from "../utils"

export abstract class FirstClassActions {
    abstract execute(
        auth: Auth,
        transactionFunc: Function,
        txOptions: EnvOption,
        estimate: boolean
    ): Promise<ExecutionReceipt | UserOp | bigint>
    abstract getAddress(options?: EnvOption): Promise<Address>

    async swap(
        auth: Auth,
        input: SwapParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp | bigint> {
        return await this.execute(auth, _swap(input), options, estimate)
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
