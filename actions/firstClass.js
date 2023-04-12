const { verifyValidParametersForLocation } = require("../utils")
const { _swap } = require("./swap")
const { _transfer, _approve } = require("./token")
const { isContract } = require('../utils')
const util = require('util')


const transferExpected = ["to", "amount"]
const approveExpected = ["spender", "amount", "token"]
const swapExpected = ["in", "out", "amount"]

class FirstClassActions {
    estimateGas = {}
    async execute(auth, actionFunc, txOptions = global, estimateGas = false) { }
    async transfer(auth, input, options = global, estimateGas = false) {
        verifyValidParametersForLocation("Wallet.transfer", input, transferExpected)
        return await this.execute(auth, _transfer(input), options, estimateGas)
    }

    async approve(auth, input, options = global) {
        verifyValidParametersForLocation("Wallet.approve", input, approveExpected)
        return await this.execute(auth, _approve(input), options, estimateGas)
    }

    async swap(auth, input, options = global) {
        verifyValidParametersForLocation("Wallet.swap", input, swapExpected)
        return await this.execute(auth, _swap(input), options, estimateGas)
    }

    async create(auth, options = global) {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        }
        else {
            return await this.execute(auth, genCall({ to: address, data: "0x" }, 30_000), options, estimateGas)
        }
    }
}

const genCall = (data, callGasLimit = 100_000) => {
    return async () => {
        const gasInfo = { callGasLimit }
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}

function getAllFuncs(toCheck) {
    const props = [];
    let obj = toCheck;
    do {
        props.push(...Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    return props
}

const modifyFirstClass = () => {
    const funcs = Object.getOwnPropertyNames(FirstClassActions.prototype)
    const newProto = { estimateGas: {} }
    for (const func of funcs) {
        const callfunc = async function (...args) {
            console.log(...args.slice(0, 3))
            // return await this.prototype[func](...args.slice(0, 3), true)
        }
        newProto.estimateGas[func] = callfunc
    }
    Object.setPrototypeOf(FirstClassActions.prototype, { ...FirstClassActions.prototype, ...newProto })
    return FirstClassActions
}

module.exports = { FirstClassActions: modifyFirstClass(), genCall };
