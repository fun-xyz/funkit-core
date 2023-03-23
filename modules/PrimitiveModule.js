const { Module } = require("./Module")

class PrimitiveModule extends Module {
    async encodeInitCall() {
        return false;
    }
}

module.exports = { PrimitiveModule }