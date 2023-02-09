const ethers = require('ethers')
const { Module } = require("./Module")
const { Token, TokenTypes } = require('../../utils/Token');

const { swapExec } = require('../../utils/SwapUtils');

const ApproveAndSwapObj = require("../../utils/abis/ApproveAndSwap.json");
const APROVE_AND_SWAP_ADDR = "0x7127707D0515D465567A22A012a6740A3aA60501"

class ApproveAndSwap extends Module {
    actionAddr = "0x92b0d1Cc77b84973B7041CB9275d41F09840eaDd"

    constructor(routerAddr) {
        super()
        this.routerAddr = routerAddr
        this.actionContract = new ethers.Contract(APROVE_AND_SWAP_ADDR, ApproveAndSwapObj.abi)
    }

    async _encodeERC20Swap(tokenInAddress, routerAddr, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapERC20(tokenInAddress, routerAddr, amount, data)
    }

    async _encodeETHSwap(to, amount, data) {
        return await this.actionContract.populateTransaction.executeSwapETH(to, amount, data)
    }

    async createSwap(tokenInData, tokenOutData, amountIn, slippage = 5, percentDec = 100) {
        const tokenIn = await Token.createFrom(tokenInData)
        const tokenOut = await Token.createFrom(tokenOutData)

        const tokenInAddress = await tokenIn.getAddress()
        const tokenOutAddress = await tokenOut.getAddress()

        const { data, to, amount } = await swapExec(this.wallet.provider, this.routerAddr, tokenInAddress, tokenOutAddress, amountIn, this.wallet.address, slippage, percentDec)

        if (tokenIn.type == TokenTypes.ETH) {
            const swapData = await this._encodeETHSwap(to, amount, data)
            return await this.createUserOpFromCallData(swapData)
        }
        const swapData = await this._encodeERC20Swap(tokenInAddress, this.routerAddr, amount, data)
        return await this.createUserOpFromCallData(swapData)
    }



}


// scrape rpc data for detailed erc20s

module.exports = { ApproveAndSwap }