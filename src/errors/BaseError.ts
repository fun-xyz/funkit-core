import { stringify } from "../utils"

export class BaseError extends Error {
    baseType: string
    type: string
    code: string
    timestamp: string
    sourceMsg: string
    functionName: string
    paramsUsed: any
    fixSuggestion: string
    docLink: string
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
        const currentTime = new Date().toUTCString()
        const errorMsg = `baseType: ${baseType}
            type: ${type}
            code: ${code}
            timestamp: ${currentTime}
            message: ${msg}
            functionName: ${functionName}
            paramsUsed: ${stringify(paramsUsed)}
            fixSuggestion: ${fixSuggestion}
            docLink: ${docLink}`
        super(errorMsg)
        if (isInternal) {
            this.loadEnd()
        }
        this.baseType = baseType
        this.type = type
        this.code = code
        this.timestamp = currentTime
        this.sourceMsg = msg
        this.functionName = functionName
        this.paramsUsed = paramsUsed
        this.fixSuggestion = fixSuggestion
        this.docLink = docLink
    }

    loadEnd() {
        const email = "support@fun.xyz"
        const twttr = "https://twitter.com/fun"
        const phone = "(510) 585-3423"
        const infoLine = `\tEmail: ${email}\n\tTwitter: ${twttr}\n\tPhone Number: ${phone}`
        this.message += `\n\n\tThis is an internal sdk error. Please contact the fun team at these contacts for the fastest response.\n${infoLine}`
    }
}
