const { Module } = require("./Module")
const { swapExec } = require('./SwapUtils');
const ethers = require('ethers')

const abi = ethers.utils.defaultAbiCoder;


class ApproveAndSwap extends Module {
    wallet = {}
    noInit = true

    actionAddr = "0x1bEfE2d8417e22Da2E0432560ef9B2aB68Ab75Ad"

    async createExecution(routerAddr, tokenInAddress, tokenOutAddress, amountIn, slippage = 5, percentDec = 100) {
        const { data, to, amount } = await swapExec(this.wallet.provider, routerAddr, tokenInAddress, tokenOutAddress, amountIn, this.wallet.address, slippage, percentDec)
        const execCallData = abi.encode(["address", "address", "uint256", "bytes"], [tokenInAddress, to, amount, data])
        const opData = await this.encodeExecuteCall(execCallData)
        return await this.createUserOpFromCallData(opData)

    }
}



module.exports = { ApproveAndSwap }