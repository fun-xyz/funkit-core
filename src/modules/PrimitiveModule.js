const { Module } = require("./Module")

class PrimitiveModule extends Module {
    async encodeInitCall() {
        return false;
    }

    async create() {
        return {};
    }
}

module.exports = { PrimitiveModule }