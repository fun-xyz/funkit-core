import { Address } from "viem"
import { SwapParams, UniSwapPoolFeeOptions } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, APPROVE_AND_SWAP_ABI, TransactionData, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { ErrorCode, InvalidParameterError } from "../errors"
import { sendRequest } from "../utils"
import { UniswapV2Addrs, UniswapV3Addrs, fromReadableAmount, oneInchAPIRequest, swapExec, swapExecV2 } from "../utils/SwapUtils"
import { ContractInterface } from "../viem/ContractInterface"

export const oneInchSupported = [1, 56, 31337, 36864]
export const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
const DEFAULT_SLIPPAGE = 0.5 // .5%
const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const approveAndSwapInterface = new ContractInterface(APPROVE_AND_SWAP_ABI)

const getOneInchApproveTx = async (tokenAddress: string, amt: number, options: EnvOption): Promise<TransactionData> => {
    const inTokenDecimals = await get1inchTokenDecimals(tokenAddress, options)
    tokenAddress = await Token.getAddress(tokenAddress, options)
    const amount = fromReadableAmount(amt, Number(inTokenDecimals)).toString()
    const url = await oneInchAPIRequest("/approve/transaction", amount ? { tokenAddress, amount } : { tokenAddress })
    const transaction = await sendRequest(url, "GET", "")
    return transaction as TransactionData
}

const getOneInchSwapTx = async (swapParams: SwapParams, fromAddress: string, options: EnvOption) => {
    const inTokenDecimals = await get1inchTokenDecimals(swapParams.tokenIn, options)
    const fromTokenAddress = await Token.getAddress(swapParams.tokenIn, options)
    const toTokenAddress = await Token.getAddress(swapParams.tokenOut, options)
    const amount = fromReadableAmount(swapParams.amount, Number(inTokenDecimals))
    const formattedSwap = {
        fromTokenAddress,
        toTokenAddress,
        amount: amount,
        fromAddress,
        slippage: swapParams.slippage,
        disableEstimate: true,
        allowPartialFill: false,
        destReceiver: swapParams.returnAddress ? swapParams.returnAddress : fromAddress
    }

    const url = await oneInchAPIRequest("/swap", formattedSwap)
    const res = await sendRequest(url, "GET", "")
    return res.tx
}

const get1inchTokenDecimals = async (tokenAddress: string, options: EnvOption) => {
    if (tokenAddress !== eth1InchAddress) {
        const inToken = new Token(tokenAddress)
        return await inToken.getDecimals(options)
    }
    return 18
}

export const oneInchTransactionParams = async (
    swapParams: SwapParams,
    walletAddress: Address,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    if (!oneInchSupported.includes(Number(await chain.getChainId()))) {
        throw new InvalidParameterError(
            ErrorCode.ChainNotSupported,
            "Incorrect chainId, oneInch only available on Ethereum mainnet and polygon",
            "wallet.swap",
            { swapParams },
            "Provide correct chainId.",
            "https://docs.fun.xyz"
        )
    }

    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    let approveTx: TransactionData | undefined

    const inToken = new Token(swapParams.tokenIn)
    const outToken = new Token(swapParams.tokenOut)
    if (outToken.isNative) {
        swapParams.tokenOut = eth1InchAddress
    }
    if (inToken.isNative) {
        swapParams.tokenIn = eth1InchAddress
        const swapTx = await getOneInchSwapTx(swapParams, walletAddress, txOptions)
        return { to: approveAndExecAddress, value: swapParams.amount, data: swapTx.data }
    } else {
        approveTx = await getOneInchApproveTx(swapParams.tokenIn, swapParams.amount, txOptions)
        const swapTx = await getOneInchSwapTx(swapParams, walletAddress, txOptions)
        return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
            swapTx.to,
            swapTx.value,
            swapTx.data,
            inToken,
            approveTx.data
        ])
    }
}

export const uniswapV3SwapTransactionParams = async (
    params: SwapParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const client = await chain.getClient()
    const tokenSwapAddress = await chain.getAddress("tokenSwapAddress")
    const univ3quoter = await chain.getAddress("univ3quoter")
    const univ3factory = await chain.getAddress("univ3factory")
    const univ3router = await chain.getAddress("univ3router")
    const tokenIn = new Token(params.tokenIn)
    const tokenOut = new Token(params.tokenOut)

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
        returnAddress: params.returnAddress!,
        percentDecimal,
        slippage,
        poolFee: params.poolFee ?? UniSwapPoolFeeOptions.medium
    }

    const { data, amount } = await swapExec(client, uniswapAddrs, swapParams, Number(await chain.getChainId()))
    if (tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}

export const uniswapV2SwapTransactionParams = async (
    params: SwapParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const client = await chain.getClient()
    const tokenSwapAddress = await chain.getAddress("tokenSwapAddress")
    const factory = await chain.getAddress("UniswapV2Factory")
    const router = await chain.getAddress("UniswapV2Router02")

    const tokenIn = new Token(params.tokenIn)
    const tokenOut = new Token(params.tokenOut)

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
        returnAddress: params.returnAddress!,
        percentDecimal,
        slippage,
        poolFee: params.poolFee ?? UniSwapPoolFeeOptions.medium
    }
    const chainId = Number(await chain.getChainId())

    const { data, to, amount } = await swapExecV2(client, uniswapAddrs, swapParams, chainId)

    if (tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [to, amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}
