import { Address } from "viem"
import { TransactionParams, WALLET_CONTRACT_INTERFACE } from "../common"

export const createExecuteBatchTxParams = (params: TransactionParams[], walletAddress: Address): TransactionParams => {
    const targets = params.map((param) => param.to)
    const values = params.map((param) => param.value ?? 0n)
    const datas = params.map((param) => param.data ?? "0x")
    return WALLET_CONTRACT_INTERFACE.encodeTransactionParams(walletAddress, "createBatchOperation", [targets, values, datas])
}
