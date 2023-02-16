const ethers = require('ethers')
const { Module, LOCAL_FORK_CHAIN_ID } = require("./Module")
const { Token, TokenTypes } = require('../../utils/Token')
const { swapExec } = require('../../utils/SwapUtils')
const ApproveAndSwapObj = require("../../utils/abis/ApproveAndSwap.json")
const { DataServer } = require('../../utils/DataServer')
const testConfig = require("../../test/testConfig.json")

const MODULE_NAME = "approveAndSwap"

class TokenSwap extends Module {

    async init(chainId) {
        var approveAndSwapAddress, univ3router, univ3quoter, univ3factory
        if (chainId != LOCAL_FORK_CHAIN_ID) {
            ({
                approveAndSwapAddress,
                univ3router,
                univ3quoter,
                univ3factory
            } = await DataServer.getModuleInfo(MODULE_NAME, chainId))
        } else {
            approveAndSwapAddress = testConfig.approveAndSwapAddress
            univ3router = testConfig.uniswapV3RouterAddress
            univ3quoter = testConfig.quoterContractAddress
            univ3factory = testConfig.poolFactoryAddress
        }

        this.addr = approveAndSwapAddress
        this.uniswapV3RouterAddr = univ3router
        this.quoterContractAddr = univ3quoter
        this.poolFactoryContractAddr = univ3factory

        this.abi = ApproveAndSwapObj.abi
        this.actionContract = new ethers.Contract(approveAndSwapAddress, ApproveAndSwapObj.abi)
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

module.exports = { TokenSwap }