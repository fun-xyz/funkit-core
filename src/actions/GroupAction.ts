import { Action } from "./Action"
import { createGroupTxParams, removeGroupTxParams, updateGroupTxParams } from "./Group"
import { CreateGroupParams } from "./types"
import { TransactionParams } from "../common/types"
import { GlobalEnvOption } from "../config"

export class GroupAction extends Action {
    override txOptions: GlobalEnvOption
    constructor(options: GlobalEnvOption) {
        super(options)
        this.txOptions = options
    }

    async createGroupTxParams(params: CreateGroupParams): Promise<TransactionParams> {
        return await createGroupTxParams(params, this.txOptions)
    }

    async updateGroupTxParams(params: CreateGroupParams): Promise<TransactionParams> {
        return await updateGroupTxParams(params, this.txOptions)
    }

    async removeGroupTxParams(params: CreateGroupParams): Promise<TransactionParams> {
        return await removeGroupTxParams(params, this.txOptions)
    }
}
