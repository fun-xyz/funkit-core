const discord = "https://discord.gg/7ZRAv4es"
export class BaseError extends Error {
    timestamp: string

    constructor(
        public baseType: string,
        public type: string,
        public code: string,
        msg: string,

        public paramsUsed: any,
        fixSuggestion: string,
        docLink: string,
        isInternal = false
    ) {
        super(`${msg}\n\n${fixSuggestion}\nDocs: ${docLink}\nDiscord: ${discord}`)
        if (isInternal) {
            this.loadEnd()
        }
        this.message += "\n\nTrace:"
        this.timestamp = new Date().toUTCString()
    }

    loadEnd() {
        this.message += "\n\nThis is an internal sdk error. Please contact the fun team at our Discord for the fastest response."
    }
}
