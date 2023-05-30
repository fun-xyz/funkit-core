const logHelper = (tabwith, logData) => {
    if (typeof logData == "string") {
        return `${"\t".repeat(tabwith)}${logData}`
    }
    if (Array.isArray(logData)) {
        return logData.map((log) => `${"\t".repeat(tabwith)}${log}`).join("\n")
    }
}

class Helper {
    constructor(title, data, message = "") {
        this.title = title
        this.data = data
        this.msgs = message ? [message] : []
    }

    log(width = 1) {
        const lines = []
        this.msgs.length ? lines.push(logHelper(width, this.msgs)) : ""
        lines.push(logHelper(width, `${this.title}: ${JSON.stringify(this.data, null, "\t")}`))
        return lines.join("\n") + "\n"
    }

    pushMessage(msg) {
        this.msgs.push(msg)
    }

    popMessage() {
        return this.msgs.pop()
    }

    pushList(title, reasons, seperator = "\n\t - ") {
        let msg = title
        reasons = reasons.join(seperator)
        msg += seperator + reasons
        this.pushMessage(msg)
    }
}

module.exports = { Helper }
