const { Module } = require("./Module")
const { swapExec } = require('./SwapUtils');
const ethers = require('ethers')

const ApproveAndSwapObj = require("../../../../fun-wallet-smart-contract/artifacts/contracts/modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json")
// const ApproveAndSwapObj = require("../utils/abis/ApproveAndSwap.json")





class ApproveAndSwap extends Module {
    actionAddr = "0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D"



    constructor(routerAddr) {
        super()
        this.routerAddr = routerAddr
        this.actionContract = new ethers.Contract(this.actionAddr, ApproveAndSwapObj.abi)
    }

    async encodeERC20Swap(tokenInAddress, routerAddr, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapERC20(tokenInAddress, routerAddr, amount, data)
    }

    async encodeETHSwap(to, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapETH(to, amount, data)
    }

    async createSwap(tokenIn, tokenOut, amountIn, slippage = 5, percentDec = 100) {
        const tokenInAddress = ""
        const tokenOutAddress = ""
        const { data, amount } = await swapExec(this.wallet.provider, this.routerAddr, tokenInAddress, tokenOutAddress, amountIn, this.wallet.address, slippage, percentDec)
        const swapData = await this.encodeERC20Swap(tokenInAddress, this.routerAddr, amount, data)
        return await this.createUserOpFromCallData(swapData)
    }

    async createSwap(tokenOut, amountIn, slippage = 5, percentDec = 100) {
        const tokenOutAddress = ""
        const { data, to, amount } = await swapExec(this.wallet.provider, this.routerAddr, wethAddr, tokenOutAddress, amountIn, this.wallet.address, slippage, percentDec)
        const swapData = await this.encodeETHSwap(to, amount, data)
        return await this.createUserOpFromCallData(swapData)
    }


}

// scrape rpc data for detailed erc20s

module.exports = { ApproveAndSwap }