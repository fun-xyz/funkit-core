const ModuleObj = require("../../utils/abis/Module.json")
const { Transaction } = require("../../utils/Transaction")
const ethers = require("ethers")
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