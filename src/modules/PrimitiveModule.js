const { Module } = require("./Module")

class PrimitiveModule extends Module {
    async encodeInitCall() {
        return false;
    }
    async getPreExecTxs() {
        return []
    }
}

module.exports = { PrimitiveModule }