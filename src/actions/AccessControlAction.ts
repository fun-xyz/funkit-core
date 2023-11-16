import { createSessionUser } from "./AccessControl"
import { Action } from "./Action"
import { SessionKeyAuth } from "../auth"
import { AuthInput } from "../auth/types"
import { GlobalEnvOption } from "../config"

export class AccessControlAction extends Action {
    constructor(options: GlobalEnvOption) {
        super(options)
    }

    async createSessionUser(auth: AuthInput, params: any): Promise<SessionKeyAuth> {
        return createSessionUser(auth, params, this.txOptions)
    }
}
