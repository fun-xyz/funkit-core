import { stringify } from "../utils"

export class BaseError extends Error {
    constructor(
        baseType: string,
        type: string,
        code: string,
        msg: string,
        functionName: string,
        paramsUsed: any,
        fixSuggestion: string,
        docLink: string,
        isInternal = false
    ) {
        const errorMsg = `baseType: ${baseType}
            type: ${type}
            code: ${code}
            timestamp: ${new Date().toUTCString()}
            message: ${msg}
            functionName: ${functionName}
            paramsUsed: ${stringify(paramsUsed)}
            fixSuggestion: ${fixSuggestion}
            docLink: ${docLink}`
        super(errorMsg)
        if (isInternal) {
            this.loadEnd()
        }
    }

    loadEnd() {
        const email = "support@fun.xyz"
        const twttr = "https://twitter.com/fun"
        const phone = "(510) 585-3423"
        const infoLine = `\tEmail: ${email}\n\tTwitter: ${twttr}\n\tPhone Number: ${phone}`
        this.message += `\n\n\tThis is an internal sdk error. Please contact the fun team at these contacts for the fastest response.\n${infoLine}`
    }
}
