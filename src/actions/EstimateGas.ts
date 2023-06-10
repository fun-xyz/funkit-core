import { TransferParams } from "./types"
import { Auth } from "../auth"
import { EnvOption } from "../config"

export interface FirstClassEstimateGas {
    (auth: Auth, transactionFunc: Function, txOptions: EnvOption): Promise<bigint>
    transfer: (auth: Auth, input: TransferParams, options: EnvOption) => Promise<bigint>
}
