const logHelper = (tabwith: number, logData: string | string[]) => {
    if (typeof logData === "string") {
        return `${"\t".repeat(tabwith)}${logData}`
    }
    if (Array.isArray(logData)) {
        return logData.map((log) => `${"\t".repeat(tabwith)}${log}`).join("\n")
    }
    return ""
}

export class Helper {
    title: string
    data: any
    msgs: string[]
    constructor(title: string, data: any, message: string) {
        this.title = title
        this.data = data
        this.msgs = message ? [message] : []
    }

    log(width = 1) {
        const lines: string[] = []
        this.msgs.length ? lines.push(logHelper(width, this.msgs)) : ""
        lines.push(logHelper(width, `${this.title}: ${JSON.stringify(this.data, null, "\t")}`))
        return lines.join("\n") + "\n"
    }

    pushMessage(msg: string) {
        this.msgs.push(msg)
    }

    popMessage() {
        return this.msgs.pop()
    }
}
