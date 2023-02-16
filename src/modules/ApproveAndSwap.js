const ethers = require('ethers')
const { Module } = require("./Module")
const { Token, TokenTypes } = require('../../utils/Token');
const { swapExec } = require('../../utils/SwapUtils');
const ApproveAndSwapObj = require("../../utils/abis/ApproveAndSwap.json");

class ApproveAndSwap extends Module {

    async init(uniswapV3RouterAddr, moduleAddr) {
        // TODO query data server for routerAddr and moduleAddr
        // const { uniswapV3RouterAddr, moduleAddr } = {  }
        this.uniswapV3RouterAddr = uniswapV3RouterAddr

        this.quoterContractAddr = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
        this.poolFactoryContractAddr = "0x1F98431c8aD98523631AE4a59f267346ea31F984"

        super.init(moduleAddr)
        this.abi = ApproveAndSwapObj.abi
        this.actionContract = new ethers.Contract(moduleAddr, ApproveAndSwapObj.abi)
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

        const { data, to, amount } = await swapExec(this.wallet.provider, this.quoterContractAddr, this.poolFactoryContractAddr, this.uniswapV3RouterAddr, tokenInAddress, tokenOutAddress, amountIn, returnAddr, slippage, percentDec)
        let swapData
        if (tokenIn.type == TokenTypes.ETH) {
            swapData = await this._encodeETHSwap(to, amount, data)
        } else {
            swapData = await this._encodeERC20Swap(tokenInAddress, this.uniswapV3RouterAddr, amount, data)
        }
        return await this.createUserOpFromCallData(swapData)
    }
}

module.exports = { ApproveAndSwap }