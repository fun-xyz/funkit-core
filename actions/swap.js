const { Contract, constants } = require("ethers")
const { Interface } = require("ethers/lib/utils")
const { Token } = require("../data/Token")
const { swapExec } = require("../utils/swap")
const approveAndSwapAbi = require("../abis/ApproveAndSwap.json").abi

const approveAndSwapInterface = new Interface(approveAndSwapAbi)
const initData = approveAndSwapInterface.encodeFunctionData("init", [constants.HashZero])

const DEFAULT_SLIPPAGE = .5 // .5%
const DEFAULT_FEE = "medium"

const _swap = (params) => {
    return async (actionData) => {
        const { in: tokenIn, out: tokenOut, amount: amountIn, options: swapOptions = {} } = params
        const { wallet, chain } = actionData
        let {
            returnAddress,
            slippage,
            poolFee
        } = swapOptions

        const provider = await chain.getProvider()

        const tokenSwapAddress = await chain.getAddress("tokenSwapAddress")
        const univ3quoter = await chain.getAddress("univ3quoter")
        const univ3factory = await chain.getAddress("univ3factory")
        const univ3router = await chain.getAddress("univ3router")

        const actionContract = new Contract(tokenSwapAddress, approveAndSwapAbi, provider)

        const tokenInObj = new Token(tokenIn)
        const tokenOutObj = new Token(tokenOut)

        const tokenInAddress = await tokenInObj.getAddress({ chain });
        const tokenOutAddress = await tokenOutObj.getAddress({ chain });

        const uniswapAddrs = {
            univ3quoter,
            univ3factory,
            univ3router
        }

        if (!returnAddress) {
            const walletAddress = await wallet.getAddress({ chain })
            returnAddress = walletAddress
        }

        slippage = slippage ? slippage : DEFAULT_SLIPPAGE
        poolFee = poolFee ? poolFee : DEFAULT_FEE

        let percentDecimal = 100
        while (slippage < 1 || Math.trunc(slippage) != slippage) {
            percentDecimal *= 10
            slippage *= 10;
        }


        const swapParams = {
            tokenInAddress,
            tokenOutAddress,
            amountIn,

            // optional
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

        const errorData = {
            location: "actions.swap"
        }

        return { data: txData, errorData }
    }
}

module.exports = { _swap };