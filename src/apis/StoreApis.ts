import { getPromiseFromOp } from "../utils/userop"
import { DataFormatError } from "../errors"
import { UserOperation, getChainFromData } from "../data"
import { TEST_API_KEY, TRANSACTION_TYPE, API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/Api"
<<<<<<< HEAD
import { TransactionReceipt } from '@ethersproject/providers'
import { GlobalEnvOption } from "src/config"
=======
import { TransactionReceipt } from "@ethersproject/providers"
>>>>>>> 480aec4d71f0e0070ed4bd47e42359a44a9e0ba3

export async function storeUserOp(op: UserOperation, balance = 0, receipt = {}) {
    const globalEnvOption: GlobalEnvOption = (globalThis as any).globalEnvOption
    if (!globalEnvOption.apiKey) {
        throw new DataFormatError("apiKey", "string", "configureEnvironment")
    }
    if (globalEnvOption.apiKey == TEST_API_KEY) {
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
    if (globalEnvOption.apiKey == TEST_API_KEY) {
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
