const { Contract } = require("ethers")
const { parseUnits } = require("ethers/src.ts/utils")
const { Token } = require("../data/Token")
const { verifyValidParametersForLocation } = require("../utils/data")
const { swapExec } = require("../utils/swap")
const approveAndSwapAbi = require("../abis/ApproveAndSwap.json").abi


const swapExpectedKeys = ["tokenIn", "tokenOut", "amountIn"]

const swap = (params) => {
    return async (actionData) => {
        verifyValidParametersForLocation("actions.swap", params, swapExpectedKeys)

        const { wallet, chain, options } = actionData

        let {
            tokenIn,
            tokenOut,
            amountIn,
            returnAddress,
            percentDecimal,
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
        const tokenInAddress = await tokenInObj.getAddress(options);
        const tokenOutAddress = await Token.getAddress(tokenOut, options);

        const uniswapAddrs = {
            univ3quoter,
            univ3factory,
            univ3router
        }

        const walletAddress = await wallet.getAddress(options)

        returnAddress = returnAddress ? returnAddress : walletAddress
        percentDecimal = percentDecimal ? percentDecimal : 100
        slippage = slippage ? slippage : 5
        poolFee = poolFee ? poolFee : "medium"

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

        if (tokenIn.isNative) {
            swapData = await actionContract.populateTransaction.executeSwapETH(to, amount, data)
        } else {
            swapData = await actionContract.populateTransaction.executeSwapERC20(tokenInAddress, routerAddr, amount, data)
        }

        const gasInfo = { callGasLimit: 300_000 }
        return { to: tokenSwapAddress, gasInfo, data: swapData }
    }
}