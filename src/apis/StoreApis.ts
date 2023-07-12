import { TransactionReceipt } from "viem"
import { API_URL, TEST_API_KEY, TRANSACTION_TYPE } from "../common/constants"
import { ExecutionReceipt } from "../common/types"
import { GlobalEnvOption } from "../config"
import { UserOperation, getChainFromData } from "../data"
import { DataFormatError } from "../errors"
import { objectify } from "../utils"
import { sendPostRequest } from "../utils/ApiUtils"

export async function storeUserOp(op: UserOperation, balance = 0, receipt: ExecutionReceipt) {
    const globalEnvOption: GlobalEnvOption = (globalThis as any).globalEnvOption
    if (!globalEnvOption.apiKey) {
        throw new DataFormatError("apiKey", "string", "configureEnvironment")
    }
    if (globalEnvOption.apiKey === TEST_API_KEY) {
        return
    }
    const chain = await getChainFromData(globalEnvOption.chain)
    const body = {
        userOp: objectify(op),
        type: TRANSACTION_TYPE,
        balance,
        receipt: objectify(receipt),
        organization: globalEnvOption.orgInfo?.id,
        orgName: globalEnvOption.orgInfo?.name,
        chainId: chain.id,
        walletAddr: op.sender,
        opType: "SINGLE_OPERATION",
        authType: 0,
        proposer: op.sender,
        txid: receipt?.txid
    }
    // await sendPostRequest(API_URL, "action", body) //CHANGE TO ACTION
    await sendPostRequest("http://localhost:3000", "operation", body) //CHANGE TO ACTION
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
