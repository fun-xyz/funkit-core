import { Helper } from "./Helper"

export class BaseError extends Error {
    constructor(msg: string, helper: Helper, isInternal = false, stackDepth = 1) {
        super(msg)
        if (helper) {
            this.message += `.\n${helper.log(stackDepth)}`
        }
        if (isInternal) {
            this.loadEnd()
        }
    }

    loadEnd() {
        this.message += `\nThis is an internal sdk error please contact the fun team at these contacts for the fastest response.\n\nemail: support@fun.xyz\ntwitter: https://twitter.com/fun\n`
    }
}
