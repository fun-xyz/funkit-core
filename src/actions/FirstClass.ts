import { Hex } from "viem"
import { CreateParams } from "./types"
import { WALLET_CONTRACT_INTERFACE } from "../common"
import { TransactionData } from "../common/types"

export const genCallCalldata = async (params: TransactionData): Promise<Hex> => {
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, params.value, params.data])
}

export const createCalldata = async (params: CreateParams): Promise<Hex> => {
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, 0, "0x"])
}
