import { Interface } from "ethers/lib/utils"
import { constants, Transaction } from "ethers"
import { ActionData } from "./FirstClass"
import approveAndExecContract from "../abis/ApproveAndExec.json"

const approveAndExecInterface = new Interface(approveAndExecContract.abi)
const errorData = {
    location: "actions.approveAndExec"
}

const initData = approveAndExecInterface.encodeFunctionData("init", [constants.HashZero])

export interface ApproveAndExecParams {
    approve: Transaction
    exec: Transaction
}

export const approveAndExec = (params: ApproveAndExecParams) => {
    return async (actionData: ActionData) => {
        const appproveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        const dest = params.exec.to
        const value = params.exec.value
        const executeData = params.exec.data
        const token = params.approve.to
        const approveData = params.approve.data
        const calldata = approveAndExecInterface.encodeFunctionData("approveAndExecute", [dest, value, executeData, token, approveData])
        const txData = { to: appproveAndExecAddress, data: [initData, calldata], initAndExec: true }
        return { data: txData, errorData }
    }
}
