const { verifyValidParametersForLocation } = require("../utils")
const { _swap } = require("./swap")
const { _transfer, _approve } = require("./token")
const { isContract } = require('../utils')

const transferExpected = ["to", "amount"]
const genCallExpected = ["to"]
const approveExpected = ["spender", "amount", "token"]
const swapExpected = ["in", "out", "amount"]

class FirstClassActions {
    async execute(auth, actionFunc, txOptions = global, estimate = false) { }

    async transfer(auth, input, options = global, estimate = false) {
        verifyValidParametersForLocation("Wallet.transfer", input, transferExpected)
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(auth, input, options = global, estimate = false) {
        verifyValidParametersForLocation("Wallet.approve", input, approveExpected)
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(auth, input, options = global, estimate = false) {
        verifyValidParametersForLocation("Wallet.swap", input, swapExpected)
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async create(auth, options = global, estimate = false) {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        }
        else {
            return await this.execRawTx(auth, { to: address, data: "0x" }, options, estimate)
        }
    }

    async execRawTx(auth, input, options = global, estimate = false) {
        verifyValidParametersForLocation("Wallet.execRawTx", input, genCallExpected)
        return await this.execute(auth, genCall(input, input.gasLimit), options, estimate)
    }
}

const genCall = (data, callGasLimit = 100_000) => {
    return async () => {
        if (!data.value) {
            data.value = 0
        }
        if (!data.data) {
            data.data = "0x"
        }
        const gasInfo = { callGasLimit }
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}

module.exports = { FirstClassActions, genCall };