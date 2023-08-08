import { ApproveAndExecParams } from "./types"
import { TransactionParams } from "../common"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, ERC20_CONTRACT_INTERFACE } from "../common/constants"
import { Chain } from "../data"

export const approveAndExecTransactionParams = async (params: ApproveAndExecParams): Promise<TransactionParams> => {
    const chain = Chain.getChain({ chainIdentifier: params.chainId })
    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    const approveData = await ERC20_CONTRACT_INTERFACE.encodeData("approve", [params.approve.spender, params.approve.amount])
    return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
        params.exec.to,
        params.exec.value,
        params.exec.data,
        params.approve.token,
        approveData
    ])
}
