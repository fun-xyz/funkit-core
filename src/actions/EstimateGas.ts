import { BigNumber } from "ethers"
import { TransferParams } from "./types"
import { Auth } from "../auth"
import { EnvOption } from "../config"

export interface FirstClassEstimateGas {
    (auth: Auth, transactionFunc: Function, txOptions: EnvOption): Promise<BigNumber>
    transfer: (auth: Auth, input: TransferParams, options: EnvOption) => Promise<BigNumber>
}
