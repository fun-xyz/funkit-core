import { Interface } from "ethers/lib/utils"
import { constants, Transaction } from "ethers"
import { ActionData } from "./FirstClass"
import { BigNumber } from "ethers"

const approveAndExecAbi = require("../abis/ApproveAndExec.json").abi
const approveAndExecInterface = new Interface(approveAndExecAbi)

const errorData = {
    location: "actions.approveAndExec"
}

export type ApproveParams = {
    to: string;
    data: string;
};

export type ExecParams = {
    to: string;
    value: BigNumber;
    data: string;
};

const initData = approveAndExecInterface.encodeFunctionData("init", [constants.HashZero])

export interface ApproveAndExecParams {
    approve: ApproveParams
    exec: ExecParams
}

export const approveAndExec = (params: ApproveAndExecParams) => {
    return async (actionData: ActionData) => {
        const appproveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        console.log(appproveAndExecAddress)
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
