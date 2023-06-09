import { Interface } from "ethers/lib/utils"
import { ActionData, ActionFunction, ActionResult, ApproveAndExecParams } from "./types"
import { APPROVE_AND_EXEC_ABI } from "../common/constants"

const approveAndExecInterface = new Interface(APPROVE_AND_EXEC_ABI)
const errorData = {
    location: "actions.approveAndExec"
}

export const approveAndExecToCalldata = (params: ApproveAndExecParams): string => {
    const { to: dest, value, data: executeData } = params.exec
    const { to: token, data: approveData } = params.approve
    return approveAndExecInterface.encodeFunctionData("approveAndExecute", [dest, value, executeData, token, approveData])
}

export const approveAndExec = (params: ApproveAndExecParams): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        const approveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        const calldata = approveAndExecToCalldata(params)
        const txData = { to: approveAndExecAddress, data: calldata }
        return { data: txData, errorData }
    }
}
