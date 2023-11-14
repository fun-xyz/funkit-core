import { Action } from "./Action"
import { createGroupTxParams, removeGroupTxParams, updateGroupTxParams } from "./Group"
import { CreateGroupParams } from "./types"
import { TransactionParams } from "../common/types"
import { GlobalEnvOption } from "../config"
import { Chain } from "../data"

export class GroupAction extends Action {
    override txOptions: GlobalEnvOption
    constructor(options: GlobalEnvOption) {
        super(options)
        this.txOptions = options
    }

    async createGroupTxParams(params: CreateGroupParams): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
        return await createGroupTxParams(params, chain)
    }

    async updateGroupTxParams(params: CreateGroupParams): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
        return await updateGroupTxParams(params, chain)
    }

    async removeGroupTxParams(params: CreateGroupParams): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
        return await removeGroupTxParams(params, chain)
    }
}
