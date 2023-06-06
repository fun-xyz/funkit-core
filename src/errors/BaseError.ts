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
        const version = "v0.2.7";
        const email = "support@fun.xyz"
        const twttr = "https://twitter.com/fun"
        const phone = "(510) 585-3423"
        const infoLine = `Visit https://docs.fun.xyz for documentation about this command.\nEmail: ${email}\nTwitter: ${twttr}\nPhone Number: ${phone}`;
        this.message +=
            `\nThis is an internal sdk error. Please contact the fun team at these contacts for the fastest response.\nversion: ${version}\ninfo: ${infoLine}`;
    }
}
