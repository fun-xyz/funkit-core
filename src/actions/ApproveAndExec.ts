import { Hex } from "viem"
import { ApproveAndExecParams } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, ERC20_CONTRACT_INTERFACE, WALLET_CONTRACT_INTERFACE } from "../common/constants"
import { Chain } from "../data"

export const approveAndExecCalldata = async (params: ApproveAndExecParams): Promise<Hex> => {
    const chain = new Chain({ chainId: params.chainId.toString() })
    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    const approveData = await ERC20_CONTRACT_INTERFACE.encodeTransactionData(params.approve.token, "approve", [
        params.approve.spender,
        params.approve.amount
    ])
    const data = APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionData(approveAndExecAddress, "approveAndExecute", [
        params.exec.to,
        params.exec.value,
        params.exec.data,
        params.approve.token,
        approveData
    ])
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [approveAndExecAddress, 0, data.data])
}
