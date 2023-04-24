const { Contract, constants } = require("ethers")
const { Interface } = require("ethers/lib/utils")
const { Token } = require("../data/Token")
const { swapExec, fromReadableAmount } = require("../utils/swap")
const fetch = require('node-fetch');
const { parseOptions } = require('../utils')
const { oneInchAPIRequest } = require('../utils/swap')
const { sendRequest } = require('../utils');
const { approveAndExec } = require("./approveAndExec");

const approveAndSwapAbi = require("../abis/ApproveAndSwap.json").abi
const approveAndSwapInterface = new Interface(approveAndSwapAbi)
const initData = approveAndSwapInterface.encodeFunctionData("init", [constants.HashZero])

const DEFAULT_SLIPPAGE = .5 // .5%
const DEFAULT_FEE = "medium"

const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const _1inchRouter = "0x1111111254eeb25477b68fb85ed929f73a960582"
const errorData = {
    location: "actions.swap"
}

// const oneInchSupported = [1, 56, 137]
const oneInchSupported = [1, 56, 137, 31337]


const _swap = (params) => {
    return async (actionData) => {
        let { in: tokenIn, out: tokenOut, amount: amountIn, options: swapOptions = {} } = params
        params = {
            tokenIn,
            tokenOut,
            amountIn,
            ...swapOptions
        }
        params.slippage = params.slippage ? params.slippage : 1
        //if mainnet, use 1inch
        const { wallet, chain, options } = actionData
        if (oneInchSupported.includes(parseInt(chain.id))) {
            const address = await actionData.wallet.getAddress()
            const data = await _1inchSwap(params, address, options)
            if (!data.approveTx) {
                return { data: data.swapTx, errorData }
            }
            else {
                return await approveAndExec({ approve: data.approveTx, exec: data.swapTx })(actionData)
            }
        }
        return await _uniswapSwap(params, options)(actionData)
    }
}


const _uniswapSwap = (params, options = global) => {
    return async (actionData) => {
        let { tokenIn, tokenOut, amountIn, returnAddress, slippage, poolFee } = params
        const { wallet, chain, options } = actionData

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



        return { data: txData, errorData }
    }
}

const _1inchSwap = async (swapParams, address, options = global) => {
    let approveTx = undefined
    const { chain } = await parseOptions(options)
    if (swapParams.tokenIn.toUpperCase() == chain.currency) {
        swapParams.tokenIn = eth1InchAddress
    } else {

        approveTx = await _getOneInchApproveTx(swapParams.tokenIn, swapParams.amountIn, options)
    }
    if (swapParams.tokenOut.toUpperCase() == chain.currency) {
        swapParams.tokenOut = eth1InchAddress
    }

    const swapTx = await _getOneInchSwapTx(swapParams, address, options)
    return { approveTx, swapTx }
}

const _getOneInchApproveTx = async (tokenAddress, amt, options) => {
    const parsedOptions = await parseOptions(options)

    let inTokenDecimals = 0
    if (tokenAddress != eth1InchAddress) {
        const inToken = new Token(tokenAddress)
        inTokenDecimals = await inToken.getDecimals()
    } else {
        inTokenDecimals = 18
    }
    tokenAddress = await Token.getAddress(tokenAddress, parsedOptions)
    const amount = fromReadableAmount(amt, inTokenDecimals).toString()
    const url = await oneInchAPIRequest(
        '/approve/transaction',
        amount ? { tokenAddress, amount } : { tokenAddress }
    );
    const transaction = await sendRequest(url, 'GET', "")
    return transaction
}

const _getOneInchSwapTx = async (swapParams, address, options) => {
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
        fromAddress: address,
        slippage: swapParams.slippage,
        disableEstimate: true,
        allowPartialFill: false,
    };

    if (swapParams.returnAddress) {
        formattedSwap.destReceiver = swapParams.returnAddress
    }
    const url = await oneInchAPIRequest('/swap', formattedSwap);
    const res = await sendRequest(url, 'GET', "")
    console.log(res)
    return res.tx

}


module.exports = { _swap };