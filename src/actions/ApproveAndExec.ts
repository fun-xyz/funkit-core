import { Hex } from "viem"
import { ActionData, ActionFunction, ApproveAndExecParams, FirstClassActionResult } from "./types"
import { approveAndExecContractInterface } from "../common/constants"

const errorData = {
    location: "actions.approveAndExec"
}

export const approveAndExecToCalldata = (params: ApproveAndExecParams): Hex => {
    const { to: dest, value, data: executeData } = params.exec
    const { to: token, data: approveData } = params.approve
    return approveAndExecContractInterface.encodeData("approveAndExecute", [dest, value, executeData, token, approveData])
}

export const approveAndExec = (params: ApproveAndExecParams): ActionFunction => {
    return async (actionData: ActionData): Promise<FirstClassActionResult> => {
        const approveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        const calldata = approveAndExecToCalldata(params)
        const txData = { to: approveAndExecAddress, data: calldata }
        return { data: txData, errorData }
    }
}
