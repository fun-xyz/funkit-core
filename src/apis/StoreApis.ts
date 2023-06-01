import { TransactionReceipt } from "@ethersproject/providers"
import { API_URL, TEST_API_KEY, TRANSACTION_TYPE } from "../common/constants"
import { GlobalEnvOption } from "../config"
import { UserOperation, getChainFromData } from "../data"
import { DataFormatError } from "../errors"
import { getPromiseFromOp } from "../utils"
import { sendPostRequest } from "../utils/ApiUtils"

export async function storeUserOp(op: UserOperation, balance = 0, receipt = {}) {
    const globalEnvOption: GlobalEnvOption = (globalThis as any).globalEnvOption
    if (!globalEnvOption.apiKey) {
        throw new DataFormatError("apiKey", "string", "configureEnvironment")
    }
    if (globalEnvOption.apiKey === TEST_API_KEY) {
        return
    }
    const userOp = await getPromiseFromOp(op)
    const chain = await getChainFromData(globalEnvOption.chain)
    const body = {
        userOp,
        type: TRANSACTION_TYPE,
        balance,
        receipt,
        organization: globalEnvOption.orgInfo?.id,
        orgName: globalEnvOption.orgInfo?.name,
        chainId: chain.id
    }
    await sendPostRequest(API_URL, "save-user-op", body)
}

export async function storeEVMCall(receipt: TransactionReceipt) {
    const globalEnvOption: GlobalEnvOption = (globalThis as any).globalEnvOption
    if (!globalEnvOption.apiKey) {
        throw new DataFormatError("apiKey", "string", "configureEnvironment")
    }
    if (globalEnvOption.apiKey === TEST_API_KEY) {
        return
    }

    const body = {
        receipt,
        txHash: receipt.transactionHash,
        organization: globalEnvOption.orgInfo?.id,
        orgName: globalEnvOption.orgInfo?.name
    }
    await sendPostRequest(API_URL, "save-evm-receipt", body)
}
