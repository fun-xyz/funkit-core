import { Address } from "viem"
import { createSessionUser } from "./AccessControl"
import { Action } from "./Action"
import { bridgeTransactionParams } from "./Bridge"
import { SessionKeyAuth } from "../auth"
import { AuthInput } from "../auth/types"
import { GlobalEnvOption } from "../config"

export class BridgeAction extends Action {
    constructor(txOptions: GlobalEnvOption) {
        super(txOptions)
    }

    async bridgeTransactionParams(params: any, walletAddress: Address): Promise<any> {
        return bridgeTransactionParams(params, walletAddress, this.txOptions)
    }

    async createSessionUser(auth: AuthInput, params: any): Promise<SessionKeyAuth> {
        return createSessionUser(auth, params, this.txOptions)
    }
}
