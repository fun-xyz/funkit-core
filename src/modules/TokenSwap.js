const ethers = require('ethers')
const { Module, TOKEN_SWAP_MODULE_NAME } = require("./Module")
const { TokenTypes } = require('../../utils/Token')
const { swapExec } = require('../../utils/SwapUtils')
const ApproveAndSwapObj = require("../../utils/abis/ApproveAndSwap.json")
const { DataServer } = require('../../utils/DataServer')
const ABI = ethers.utils.defaultAbiCoder

class TokenSwap extends Module {

    async init(chainId) {
        const { tokenSwapAddress, univ3router, univ3quoter, univ3factory } = await DataServer.getModuleInfo(TOKEN_SWAP_MODULE_NAME, chainId)
        this.addr = tokenSwapAddress
        this.uniswapV3RouterAddr = univ3router
        this.quoterContractAddr = univ3quoter
        this.poolFactoryContractAddr = univ3factory

        this.abi = ApproveAndSwapObj.abi
        this.actionContract = new ethers.Contract(tokenSwapAddress, ApproveAndSwapObj.abi)
        this.name = TOKEN_SWAP_MODULE_NAME
    }

    async _encodeERC20Swap(tokenInAddress, routerAddr, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapERC20(tokenInAddress, routerAddr, amount, data)
    }

    async _encodeETHSwap(to, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapETH(to, amount, data)
    }

    async _getSwapParam(tokenIn, tokenOut, amountIn, returnAddr, slippage, percentDec) {
        const tokenInAddress = await tokenIn.getAddress()
        const tokenOutAddress = await tokenOut.getAddress()

        return await swapExec(this.wallet.provider, this.quoterContractAddr, this.poolFactoryContractAddr,
            this.uniswapV3RouterAddr, tokenInAddress, tokenOutAddress, amountIn, returnAddr, slippage, percentDec)
    }

    async createSwapTx(tokenIn, tokenOut, amountIn, returnAddr, slippage, percentDec) {
        const tokenInAddress = await tokenIn.getAddress()
        const { data, to, amount } = await this._getSwapParam(tokenIn, tokenOut, amountIn, returnAddr, slippage, percentDec)

        let swapData
        if (tokenIn.type == TokenTypes.ETH) {
            swapData = await this._encodeETHSwap(to, amount, data)
        } else {
            swapData = await this._encodeERC20Swap(tokenInAddress, this.uniswapV3RouterAddr, amount, data)
        }
        return await this.createUserOpFromCallData(swapData)
    }

    async getTargetData(tokenIn, tokenOut, amountIn, returnAddr, slippage, percentDec) {
        const tokenInAddress = await tokenIn.getAddress()
        const { data, to, amount } = await this._getSwapParam(tokenIn, tokenOut, amountIn, returnAddr, slippage, percentDec)
        
        let swapTargetData
        if (tokenIn.type == TokenTypes.ETH) {
            swapTargetData = ABI.encode(["address", "uint256", "bytes"], [to, amount, data])
        } else {
            swapTargetData = ABI.encode(["address", "address", "uint256", "bytes"], [tokenInAddress, this.uniswapV3RouterAddr, amount, data])
        }
        return swapTargetData
    }
}

module.exports = { TokenSwap }