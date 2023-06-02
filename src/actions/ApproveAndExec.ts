import { BigNumber, constants } from "ethers"
import { Interface } from "ethers/lib/utils"
import { ActionData } from "./FirstClass"
import { APPROVE_AND_EXEC_ABI } from "../common"

const approveAndExecInterface = new Interface(APPROVE_AND_EXEC_ABI)
const errorData = {
    location: "actions.approveAndExec"
}

export type ApproveParams = {
    to: string
    data: string
}

export type ExecParams = {
    to: string
    value: BigNumber
    data: string
}

const initData = approveAndExecInterface.encodeFunctionData("init", [constants.HashZero])

export interface ApproveAndExecParams {
    approve: ApproveParams
    exec: ExecParams
}

export const approveAndExec = (params: ApproveAndExecParams) => {
    return async (actionData: ActionData) => {
        const approveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        const dest = params.exec.to
        const value = params.exec.value
        const executeData = params.exec.data
        const token = params.approve.to
        const approveData = params.approve.data
        const calldata = approveAndExecInterface.encodeFunctionData("approveAndExecute", [dest, value, executeData, token, approveData])
        const txData = { to: approveAndExecAddress, data: [initData, calldata], initAndExec: true }
        return { data: txData, errorData }
    }
}
