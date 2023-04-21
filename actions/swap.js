const { Contract, constants } = require("ethers")
const { Interface } = require("ethers/lib/utils")
const { Token } = require("../data/Token")
const { swapExec, fromReadableAmount } = require("../utils/swap")
const fetch = require('node-fetch');
const { parseOptions } = require('../utils')
const { oneInchAPIRequest } = require('../utils/swap')
const { sendRequest } = require('../utils')
const approveAndSwapAbi = require("../abis/ApproveAndSwap.json").abi
const approveAndSwapInterface = new Interface(approveAndSwapAbi)
const initData = approveAndSwapInterface.encodeFunctionData("init", [constants.HashZero])

const DEFAULT_SLIPPAGE = .5 // .5%
const DEFAULT_FEE = "medium"

const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


const _swap = (params) => {
    return async (actionData) => {
        const { tokenIn, tokenOut, amountIn, options: swapOptions = {} } = params
        const { wallet, chain, options } = actionData

        //if mainnet, use 1inch
        if (oneInchSupported.includes(parseInt(chain.id))) {
            const data = await _1inchSwap(params, options)
            console.log(data)
        }
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


const oneInchSupported = [1, 56, 137, 31337]
const _1inchSwap = async (swapParams, options = global) => {

    const { chain } = await parseOptions(options)
    if (swapParams.tokenIn.toUpperCase() == chain.currency) {
        swapParams.tokenIn = eth1InchAddress
    }
    if (swapParams.tokenOut.toUpperCase() == chain.currency) {
        swapParams.tokenOut = eth1InchAddress
    }
    //check approvals

    const approveTx = await getOneInchApproveTx(swapParams.tokenIn, swapParams.amountIn)
    const swapTx = await getOneInchSwapTx(swapParams, options)
    return { approveTx, swapTx }

}

const getOneInchApproveTx = async (tokenAddress, amt) => {
    let inTokenDecimals = 0
    if (tokenAddress != eth1InchAddress) {
        const inToken = new Token(tokenAddress)
        inTokenDecimals = await inToken.getDecimals()
    } else {
        inTokenDecimals = 18
    }

    const amount = fromReadableAmount(amt, inTokenDecimals).toString()
    const url = await oneInchAPIRequest(
        '/approve/transaction',
        amount ? { tokenAddress, amount } : { tokenAddress }
    );
    const transaction = await sendRequest(url, 'GET', "")
    return transaction
}
const getOneInchSwapTx = async (swapParams, options) => {
    const parsedOptions = await parseOptions(options)
    let inTokenDecimals = 0
    if (swapParams.tokenIn != eth1InchAddress) {
        const inToken = new Token(swapParams.tokenIn)
        inTokenDecimals = await inToken.getDecimals()
    } else {
        inTokenDecimals = 18
    }

    const fromTokenAddress = await Token.getAddress(swapParams.tokenIn, parsedOptions)
    const toTokenAddress = await Token.getAddress(swapParams.tokenOut, parsedOptions)
    const amount = fromReadableAmount(swapParams.amountIn, inTokenDecimals)
    const formattedSwap = {
        fromTokenAddress,
        toTokenAddress,
        amount: amount,
        fromAddress: constants.AddressZero,
        slippage: swapParams.slippage,
        disableEstimate: false,
        allowPartialFill: false,
    };
    const url = await oneInchAPIRequest('/swap', formattedSwap);
    const res = await sendRequest(url, 'GET', "")
    return res.tx

}

module.exports = { _swap, getOneInchApproveTx, getOneInchSwapTx };