const ethers = require('ethers')
const { Module } = require("./Module")
const { Token, TokenTypes } = require('../../utils/Token');
const { swapExec } = require('../../utils/SwapUtils');
const ApproveAndSwapObj = require("../../utils/abis/ApproveAndSwap.json");
const APROVE_AND_SWAP_ADDR = require("../../test/contractConfig.json").approveAndSwapAddress

class ApproveAndSwap extends Module {

    constructor(routerAddr) {
        super(APROVE_AND_SWAP_ADDR)
        this.routerAddr = routerAddr
        this.abi = ApproveAndSwapObj.abi
        this.actionContract = new ethers.Contract(APROVE_AND_SWAP_ADDR, ApproveAndSwapObj.abi)
    }

    async _encodeERC20Swap(tokenInAddress, routerAddr, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapERC20(tokenInAddress, routerAddr, amount, data)
    }

    async _encodeETHSwap(to, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapETH(to, amount, data)
    }

    async createSwap(tokenInData, tokenOutData, amountIn, returnAddr = this.wallet.address, slippage = 5, percentDec = 100) {
        const tokenIn = await Token.createFrom(tokenInData)
        const tokenOut = await Token.createFrom(tokenOutData)

        const tokenInAddress = await tokenIn.getAddress()
        const tokenOutAddress = await tokenOut.getAddress()

        const { data, to, amount } = await swapExec(this.wallet.provider, this.routerAddr, tokenInAddress, tokenOutAddress, amountIn, returnAddr, slippage, percentDec)

        if (tokenIn.type == TokenTypes.ETH) {
            const swapData = await this._encodeETHSwap(to, amount, data)
            return await this.createUserOpFromCallData(swapData)
        }
        const swapData = await this._encodeERC20Swap(tokenInAddress, this.routerAddr, amount, data)
        return await this.createUserOpFromCallData(swapData)
    }
}

module.exports = { ApproveAndSwap }