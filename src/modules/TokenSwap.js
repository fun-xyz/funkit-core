const ethers = require('ethers')
const { Module, TOKEN_SWAP_MODULE_NAME } = require("./Module")
const { Token, TokenTypes } = require('../../utils/Token')
const { swapExec } = require('../../utils/SwapUtils')
const ApproveAndSwapObj = require("../../utils/abis/ApproveAndSwap.json")
const { DataServer } = require('../../utils/DataServer')

class TokenSwap extends Module {

    async init(chainId) {
        const { tokenSwapAddress, univ3router, univ3quoter, univ3factory } = 
            await DataServer.getModuleInfo(TOKEN_SWAP_MODULE_NAME, chainId)
        
        this.addr = tokenSwapAddress
        this.uniswapV3RouterAddr = univ3router
        this.quoterContractAddr = univ3quoter
        this.poolFactoryContractAddr = univ3factory

        this.abi = ApproveAndSwapObj.abi
        this.actionContract = new ethers.Contract(tokenSwapAddress, ApproveAndSwapObj.abi)
    }

    async _encodeERC20Swap(tokenInAddress, routerAddr, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapERC20(tokenInAddress, routerAddr, amount, data)
    }

    async _encodeETHSwap(to, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapETH(to, amount, data)
    }

    async createSwapTx(tokenInData, tokenOutData, amountIn, returnAddr = this.wallet.address, slippage, percentDec) {
        const tokenIn = await Token.createToken(tokenInData)
        const tokenOut = await Token.createToken(tokenOutData)

        const tokenInAddress = await tokenIn.getAddress()
        const tokenOutAddress = await tokenOut.getAddress()

        const { data, to, amount } = await swapExec(this.wallet.provider, this.quoterContractAddr, this.poolFactoryContractAddr, 
            this.uniswapV3RouterAddr, tokenInAddress, tokenOutAddress, amountIn, returnAddr, slippage, percentDec)
        let swapData
        if (tokenIn.type == TokenTypes.ETH) {
            swapData = await this._encodeETHSwap(to, amount, data)
        } else {
            swapData = await this._encodeERC20Swap(tokenInAddress, this.uniswapV3RouterAddr, amount, data)
        }
        return await this.createUserOpFromCallData(swapData)
    }
    async getPreExecTxs() {
        return []
    }
}

module.exports = { TokenSwap }