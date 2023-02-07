const { Module } = require("./Module")

class GeneralCall extends Module {
    wallet = {}
    noInit = true

    create() {

    }

    async createExecution({ to, data }) {
        return await this.createUserOpFromCallData(to, data)
    }

}



module.exports = { GeneralCall }