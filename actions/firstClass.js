const { verifyFunctionParams } = require("../utils")
const { _swap, getOneInchApproveTx, getOneInchSwapTx } = require("./swap")
const { _transfer, _approve } = require("./token")
const { isContract, parseOptions } = require('../utils')
const transferExpected = ["to", "amount"]
const genCallExpected = ["to"]
const approveExpected = ["spender", "amount", "token"]
const swapExpected = ["tokenIn", "tokenOut", "amountIn"]

const oneInchSupported = [1, 56, 137]

class FirstClassActions {
    async execute(auth, transactionFunc, txOptions = global, estimate = false) { }

    async transfer(auth, input, options = global, estimate = false) {
        verifyFunctionParams("Wallet.transfer", input, transferExpected)
        return await this.execute(auth, _transfer(input), options, estimate)
    }
    async approve(auth, input, options = global, estimate = false) {
        verifyFunctionParams("Wallet.approve", input, approveExpected)
        return await this.execute(auth, _approve(input), options, estimate)
    }
    async swap(auth, { in: tokenIn, out: tokenOut, amount: amountIn, options: swapOptions = {} }, options = global) {
        const swapParams = {
            tokenIn,
            tokenOut,
            amountIn,
            ...swapOptions
        }
        swapParams.slippage = swapParams.slippage ? swapParams.slippage : 1
        verifyFunctionParams("Wallet.swap", swapParams, swapExpected)
        const { chain } = await parseOptions(options)
        //if mainnet, use 1inch
        if (oneInchSupported.includes(parseInt(chain.id))) {
            if (swapParams.tokenIn.toUpperCase() == chain.currency) {
                swapParams.tokenIn = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            }
            if (swapParams.tokenOut.toUpperCase() == chain.currency) {
                swapParams.tokenOut = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            }
            //check approvals
            const address = await this.getAddress()
            let approveReceipt = ""
            const approveTx = await getOneInchApproveTx(swapParams.tokenIn, amountIn, address)
            approveReceipt = await this.execute(auth, genCall(approveTx, 300_000), options)
            const swapTx = await getOneInchSwapTx(swapParams, address)
            const swapReceipt = await this.execute(auth, genCall(swapTx, 300_000), options)
            return { approveReceipt, swapReceipt }
        }
        return await this.execute(auth, _swap(swapParams), options)
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
        verifyFunctionParams("Wallet.execRawTx", input, genCallExpected)
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
