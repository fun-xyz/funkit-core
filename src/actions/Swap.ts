import { OneInchSwapParams, UniSwapPoolFeeOptions, UniswapParams } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, APPROVE_AND_SWAP_ABI, TransactionData, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { ErrorCode, InvalidParameterError } from "../errors"
import { sendRequest } from "../utils"
import { UniswapV2Addrs, UniswapV3Addrs, fromReadableAmount, oneInchAPIRequest, swapExec, swapExecV2 } from "../utils/SwapUtils"
import { ContractInterface } from "../viem/ContractInterface"

const DEFAULT_SLIPPAGE = 0.5 // .5%

const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

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

export const OneInchTransactionParams = async (swapParams: OneInchSwapParams): Promise<TransactionParams> => {
    const supportedChains = [1, 137, 31337, 36865]
    if (!supportedChains.includes(swapParams.chainId)) {
        throw new InvalidParameterError(
            ErrorCode.ChainNotSupported,
            "Incorrect chainId, oneInch only available on Ethereum mainnet and polygon",
            "wallet.swap",
            { swapParams },
            "Provide correct chainId.",
            "https://docs.fun.xyz"
        )
    }
    const chain = Chain.getChain({ chainIdentifier: swapParams.chainId })
    const options: EnvOption = { chain }

    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    let approveTx: TransactionData | undefined

    const inToken = new Token(swapParams.in)
    const outToken = new Token(swapParams.out)
    if (outToken.isNative) {
        swapParams.out = eth1InchAddress
    }
    if (inToken.isNative) {
        swapParams.in = eth1InchAddress
        const swapTx = await _getOneInchSwapTx(swapParams, swapParams.returnAddress, options)
        return { to: approveAndExecAddress, value: swapParams.amount, data: swapTx.data }
    } else {
        approveTx = await _getOneInchApproveTx(swapParams.in, swapParams.amount, options)
        const swapTx = await _getOneInchSwapTx(swapParams, swapParams.returnAddress, options)
        return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
            swapTx.to,
            swapTx.value,
            swapTx.data,
            inToken,
            approveTx.data
        ])
    }
}

export const uniswapV3SwapTransactionParams = async (params: UniswapParams): Promise<TransactionParams> => {
    const chain = Chain.getChain({ chainIdentifier: params.chainId })
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
    if (tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}

export const uniswapV2SwapTransactionParams = async (params: UniswapParams): Promise<TransactionParams> => {
    const chain = Chain.getChain({ chainIdentifier: params.chainId })
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

    if (tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [to, amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}
