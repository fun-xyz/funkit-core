import { Address, Hex } from "viem"
import { CreateParams } from "./types"
import { Auth } from "../auth"
import { WALLET_CONTRACT_INTERFACE } from "../common"
import { ExecutionReceipt, TransactionData } from "../common/types"
import { EnvOption } from "../config"
import { UserOp } from "../data"

export abstract class FirstClassActions {
    abstract execute(
        auth: Auth,
        transactionFunc: Function,
        txOptions: EnvOption,
        estimate: boolean
    ): Promise<ExecutionReceipt | UserOp | bigint>
    abstract getAddress(options?: EnvOption): Promise<Address>

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

export const genCallCalldata = async (params: TransactionData): Promise<Hex> => {
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, params.value, params.data])
}

export const createCalldata = async (params: CreateParams): Promise<Hex> => {
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, 0, "0x"])
}
