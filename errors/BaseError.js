class BaseError extends Error {
    constructor(msg, helper = "", isInternal = false, stackDepth = 1, file = "", line = "") {
        super(`${msg}`, file, line);
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

module.exports = { BaseError };