const { verifyValidParametersForLocation } = require("../utils")
const { _swap, getOneInchApproveTx, getOneInchSwapTx } = require("./swap")
const { _transfer, _approve } = require("./token")
const { isContract } = require('../utils')

const transferExpected = ["to", "amount"]
const approveExpected = ["spender", "amount", "token"]
const swapExpected = ["tokenIn", "tokenOut", "amountIn"]

const oneInchSupported = [1, 56, 137]

class FirstClassActions {
    async transfer(auth, input, options = global) {
        verifyValidParametersForLocation("Wallet.transfer", input, transferExpected)
        return await this.execute(auth, _transfer(input), options)
    }

    async approve(auth, input, options = global) {
        verifyValidParametersForLocation("Wallet.approve", input, approveExpected)
        return await this.execute(auth, _approve(input), options)
    }

    async swap(auth, { in: tokenIn, out: tokenOut, amount: amountIn, options: swapOptions = {} }, options = global) {
        const swapParams = {
            tokenIn,
            tokenOut,
            amountIn,
            ...swapOptions
        }
        verifyValidParametersForLocation("Wallet.swap", swapParams, swapExpected)
        const chain = options.chain
        //if mainnet, use 1inch
        if (oneInchSupported.includes(chain.chainId)) {
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

    async create(auth, options = global) {
    const address = await this.getAddress()
    if (await isContract(address)) {
        throw new Error("Wallet already exists as contract.")
    }
    else {
        return await this.execute(auth, genCall({ to: address, data: "0x" }, 30_000), options)
    }
}
}

const genCall = (data, callGasLimit = 100_000) => {
    return async () => {
        const gasInfo = { callGasLimit }
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}

module.exports = { FirstClassActions, genCall };
