import { BigNumber, constants } from "ethers"
import { Interface } from "ethers/lib/utils"
import { ActionData } from "./FirstClass"
import approveAndExecContract from "../abis/ApproveAndExec.json"

const approveAndExecInterface = new Interface(approveAndExecContract.abi)
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
        const ApproveAndExec = await actionData.chain.getAddress("ApproveAndExec")
        const dest = params.exec.to
        const value = params.exec.value
        const executeData = params.exec.data
        const token = params.approve.to
        const approveData = params.approve.data
        const calldata = approveAndExecInterface.encodeFunctionData("approveAndExecute", [dest, value, executeData, token, approveData])
        const txData = { to: ApproveAndExec, data: [initData, calldata], initAndExec: true }
        return { data: txData, errorData }
    }
}
