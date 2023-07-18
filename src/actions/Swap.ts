import { Hex } from "viem"
import { OneInchSwapParams, UniSwapPoolFeeOptions, UniswapParams } from "./types"
import { Auth } from "../auth"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, APPROVE_AND_SWAP_ABI, TransactionData, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { Helper, ParameterError } from "../errors"
import { sendRequest } from "../utils"
import { UniswapV2Addrs, UniswapV3Addrs, fromReadableAmount, oneInchAPIRequest, swapExec, swapExecV2 } from "../utils/SwapUtils"
import { ContractInterface } from "../viem/ContractInterface"
import { FunWallet } from "../wallet"

const DEFAULT_SLIPPAGE = 0.5 // .5%

const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
// const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
// const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]

const approveAndSwapInterface = new ContractInterface(APPROVE_AND_SWAP_ABI)

const _getOneInchApproveTx = async (tokenAddress: string, amt: number, options: EnvOption): Promise<TransactionData> => {
    const inTokenDecimals = await _get1inchTokenDecimals(tokenAddress, options)
    tokenAddress = await Token.getAddress(tokenAddress, options)
    const amount = fromReadableAmount(amt, Number(inTokenDecimals)).toString()
    const url = await oneInchAPIRequest("/approve/transaction", amount ? { tokenAddress, amount } : { tokenAddress })
    const transaction = await sendRequest(url, "GET", "")
    return transaction as TransactionData
}

const _getOneInchSwapTx = async (swapParams: OneInchSwapParams, fromAddress: string, options: EnvOption) => {
    const inTokenDecimals = await _get1inchTokenDecimals(swapParams.in, options)
    const fromTokenAddress = await Token.getAddress(swapParams.in, options)
    const toTokenAddress = await Token.getAddress(swapParams.out, options)
    const amount = fromReadableAmount(swapParams.amount, Number(inTokenDecimals))
    const formattedSwap = {
        fromTokenAddress,
        toTokenAddress,
        amount: amount,
        fromAddress,
        slippage: swapParams.slippage,
        disableEstimate: swapParams.disableEstimate ? swapParams.disableEstimate : true,
        allowPartialFill: swapParams.allowPartialFill ? swapParams.allowPartialFill : false,
        destReceiver: swapParams.returnAddress ? swapParams.returnAddress : fromAddress
    }

    const url = await oneInchAPIRequest("/swap", formattedSwap)
    const res = await sendRequest(url, "GET", "")
    return res.tx
}

const _get1inchTokenDecimals = async (tokenAddress: string, options: EnvOption) => {
    if (tokenAddress !== eth1InchAddress) {
        const inToken = new Token(tokenAddress)
        return await inToken.getDecimals(options)
    }
    return 18
}

export const OneInchCalldata = async (auth: Auth, userId: string, swapParams: OneInchSwapParams, txOptions: EnvOption): Promise<Hex> => {
    const supportedChains = [1, 137, 31337, 36865]
    if (!supportedChains.includes(swapParams.chainId)) {
        const helper = new Helper("oneInchCaldlata", swapParams.chainId, "Staking available only on Ethereum mainnet and Goerli")
        throw new ParameterError("Invalid Chain Id", "getLidoAddress", helper, false)
    }
    const chain = new Chain({ chainId: swapParams.chainId.toString() })
    txOptions.chain = chain
    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    let approveTx: TransactionData | undefined

    const inToken = new Token(swapParams.in)
    const outToken = new Token(swapParams.out)
    if (outToken.isNative) {
        swapParams.out = eth1InchAddress
    }
    if (inToken.isNative) {
        swapParams.in = eth1InchAddress
        const swapTx = await _getOneInchSwapTx(swapParams, swapParams.returnAddress, txOptions)
        const transactionParams: TransactionParams = { to: approveAndExecAddress, value: swapParams.amount, data: swapTx.data }
        return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
    } else {
        approveTx = await _getOneInchApproveTx(swapParams.in, swapParams.amount, txOptions)
        const swapTx = await _getOneInchSwapTx(swapParams, swapParams.returnAddress, txOptions)
        const data = APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionData(approveAndExecAddress, "approveAndExecute", [
            swapTx.to,
            swapTx.value,
            swapTx.data,
            inToken,
            approveTx.data
        ])
        const transactionParams: TransactionParams = { to: approveAndExecAddress, value: 0, data: data.data }
        return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
    }
}

export const uniswapV3SwapCalldata = async (auth: Auth, userId: string, params: UniswapParams, txOptions: EnvOption): Promise<Hex> => {
    const chain = new Chain({ chainId: params.chainId.toString() })
    const client = await chain.getClient()
    const tokenSwapAddress = await chain.getAddress("tokenSwapAddress")
    const univ3quoter = await chain.getAddress("univ3quoter")
    const univ3factory = await chain.getAddress("univ3factory")
    const univ3router = await chain.getAddress("univ3router")
    const tokenIn = new Token(params.in)
    const tokenOut = new Token(params.out)

    const tokenInAddress = await tokenIn.getAddress()
    const tokenOutAddress = await tokenOut.getAddress()

    const uniswapAddrs: UniswapV3Addrs = {
        univ3quoter,
        univ3factory,
        univ3router
    }

    let percentDecimal = 100
    let slippage = params.slippage ? params.slippage : DEFAULT_SLIPPAGE
    while (slippage < 1 || Math.trunc(slippage) !== slippage) {
        percentDecimal *= 10
        slippage *= 10
    }

    const swapParams = {
        tokenInAddress,
        tokenOutAddress,
        amountIn: params.amount,
        // optional
        returnAddress: params.returnAddress,
        percentDecimal,
        slippage,
        poolFee: params.poolFee ? params.poolFee : UniSwapPoolFeeOptions.medium
    }

    const { data, amount } = await swapExec(client, uniswapAddrs, swapParams, params.chainId)
    let transactionParams: TransactionParams
    let swapData
    if (tokenIn.isNative) {
        swapData = approveAndSwapInterface.encodeData("executeSwapETH", [amount, data])
        transactionParams = { to: tokenSwapAddress, value: 0, data: swapData }
    } else {
        swapData = approveAndSwapInterface.encodeData("executeSwapERC20", [tokenInAddress, amount, data])
        transactionParams = { to: tokenSwapAddress, value: 0, data: swapData }
    }
    return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
}

export const uniswapV2SwapCalldata = async (auth: Auth, userId: string, params: UniswapParams, txOptions: EnvOption): Promise<Hex> => {
    const chain = new Chain({ chainId: params.chainId.toString() })
    const client = await chain.getClient()
    const tokenSwapAddress = await chain.getAddress("tokenSwapAddress")
    const factory = await chain.getAddress("UniswapV2Factory")
    const router = await chain.getAddress("UniswapV2Router02")

    const tokenIn = new Token(params.in)
    const tokenOut = new Token(params.out)

    const tokenInAddress = await tokenIn.getAddress()
    const tokenOutAddress = await tokenOut.getAddress()

    const uniswapAddrs: UniswapV2Addrs = {
        factory,
        router
    }

    let percentDecimal = 100
    let slippage = params.slippage ? params.slippage : DEFAULT_SLIPPAGE
    while (slippage < 1 || Math.trunc(slippage) !== slippage) {
        percentDecimal *= 10
        slippage *= 10
    }

    const swapParams = {
        tokenInAddress,
        tokenOutAddress,
        amountIn: params.amount,
        // optional
        returnAddress: params.returnAddress,
        percentDecimal,
        slippage,
        poolFee: params.poolFee ? params.poolFee : UniSwapPoolFeeOptions.medium
    }
    const chainId = Number(await chain.getChainId())

    const { data, to, amount } = await swapExecV2(client, uniswapAddrs, swapParams, chainId)
    let swapData
    if (tokenIn.isNative) {
        swapData = await approveAndSwapInterface.encodeTransactionData(tokenSwapAddress, "executeSwapETH", [to, amount, data])
        const transactionParams: TransactionParams = { to: tokenSwapAddress, value: 0, data: swapData.data }
        return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
    } else {
        swapData = await approveAndSwapInterface.encodeTransactionData(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
        const transactionParams: TransactionParams = { to: tokenSwapAddress, value: 0, data: swapData.data }
        return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
    }
}
