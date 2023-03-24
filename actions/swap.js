const { Contract, constants } = require("ethers")
const { parseUnits, Interface } = require("ethers/lib/utils")
const { Token } = require("../data/Token")
const { verifyValidParametersForLocation } = require("../utils/data")
const { swapExec } = require("../utils/swap")
const approveAndSwapAbi = require("../abis/ApproveAndSwap.json").abi


const swapExpectedKeys = ["tokenIn", "tokenOut", "amountIn"]

const approveAndSwapInterface = new Interface(approveAndSwapAbi)
const initData = approveAndSwapInterface.encodeFunctionData("init", [constants.HashZero])

const _swap = (params) => {
    return async (actionData) => {
        verifyValidParametersForLocation("actions.swap", params, swapExpectedKeys)
        const { wallet, chain } = actionData
        let {
            tokenIn,
            tokenOut,
            amountIn,
            returnAddress,
            slippage,
            poolFee
        } = params

        const provider = await chain.getProvider()


        const {
            tokenSwapAddress,
            univ3quoter,
            univ3factory,
            univ3router
        } = await chain.getModuleAddresses("tokenSwap")

        const actionContract = new Contract(tokenSwapAddress, approveAndSwapAbi, provider)

        const tokenInObj = new Token(tokenIn)
        const tokenInAddress = await tokenInObj.getAddress({ chain });
        const tokenOutAddress = await Token.getAddress(tokenOut, { chain });

        const uniswapAddrs = {
            univ3quoter,
            univ3factory,
            univ3router
        }

        const walletAddress = await wallet.getAddress({ chain })

        returnAddress = returnAddress ? returnAddress : walletAddress
        slippage = slippage ? slippage : .52352
        poolFee = poolFee ? poolFee : "medium"

        let percentDecimal = 100
        while (slippage < 1 || Math.trunc(slippage) != slippage) {
            percentDecimal *= 10
            slippage *= 10;
        }


        const swapParams = {
            tokenInAddress,
            tokenOutAddress,
            amountIn,
            //optional
            returnAddress,
            percentDecimal,
            slippage,
            poolFee
        }
        const { data, to, amount } = await swapExec(provider, uniswapAddrs, swapParams)
        if (tokenInObj.isNative) {
            swapData = await actionContract.populateTransaction.executeSwapETH(to, amount, data)
        } else {
            swapData = await actionContract.populateTransaction.executeSwapERC20(tokenInAddress, univ3router, amount, data)
        }

        const txData = { to: tokenSwapAddress, data: [initData, swapData.data], initAndExec: true }
        const gasInfo = { callGasLimit: 300_000 }
        const errorData = {
            location: "actions.swap"
        }
        return { gasInfo, data: txData, errorData }
    }
}

module.exports = { _swap };