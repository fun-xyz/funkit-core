import { GlobalEnvOption } from "../config"

export abstract class Action {
    protected txOptions: GlobalEnvOption

    constructor(txOptions: GlobalEnvOption) {
        this.txOptions = txOptions
    }
}
