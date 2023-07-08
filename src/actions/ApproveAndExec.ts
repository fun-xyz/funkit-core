import { v4 as uuidv4 } from "uuid"
import { Hex } from "viem"
import { Action, ActionData, ActionFunction, ActionResult, ApproveAndExecParams } from "./types"
import { Auth } from "../auth"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE } from "../common/constants"
import { FunWallet } from "../wallet"

export class ApproveAndExec implements Action {
    public id: string

    private auth: Auth
    private params: ApproveAndExecParams
    private wallet: FunWallet

    constructor(wallet: FunWallet, auth: Auth, params: ApproveAndExecParams) {
        this.id = uuidv4()
        this.params = params
        this.auth = auth
        this.wallet = wallet
    }

    sign(): Promise<void> {
        
    }

    async execute(): Promise<void> {
        // const approveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        // const calldata = approveAndExecToCalldata(this.params)
        // const txData = { to: approveAndExecAddress, data: calldata }
        // return { data: txData, errorData }
    }
    sendToBeSigned(): Promise<void> {
        throw new Error("Method not implemented.")
    }

    schedule(): Promise<void> {
        throw new Error("Method not implemented - Needs automated actions")
    }
    cancel(): Promise<void> {
        throw new Error("Method not implemented - Needs automated actions")
    }

    createCalldata(): Hex {
        const { to: dest, value, data: executeData } = this.params.exec
        const { to: token, data: approveData } = this.params.approve
        return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeData("approveAndExecute", [dest, value, executeData, token, approveData])
    }
}
const errorData = {
    location: "actions.approveAndExec"
}

export const approveAndExecToCalldata = (params: ApproveAndExecParams): Hex => {
    const { to: dest, value, data: executeData } = params.exec
    const { to: token, data: approveData } = params.approve
    return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeData("approveAndExecute", [dest, value, executeData, token, approveData])
}

export const approveAndExec = (params: ApproveAndExecParams): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        const approveAndExecAddress = await actionData.chain.getAddress("approveAndExecAddress")
        const calldata = approveAndExecToCalldata(params)
        const txData = { to: approveAndExecAddress, data: calldata }
        return { data: txData, errorData }
    }
}
