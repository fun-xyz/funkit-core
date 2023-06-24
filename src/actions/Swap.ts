import { Address } from "viem"
import { approveAndExec } from "./ApproveAndExec"
import {
    ActionData,
    ActionFunction,
    ActionResult,
    OneInchSwapParams,
    OneInchSwapReturn,
    SwapParams,
    UniSwapPoolFeeOptions,
    UniswapParams
} from "./types"
import { APPROVE_AND_SWAP_ABI, TransactionData } from "../common"
import { EnvOption } from "../config"
import { getChainFromData } from "../data"
import { Token } from "../data/Token"
import { sendRequest } from "../utils"
import { UniswapV2Addrs, UniswapV3Addrs, fromReadableAmount, oneInchAPIRequest, swapExec, swapExecV2 } from "../utils/SwapUtils"
import { ContractInterface } from "../viem/ContractInterface"

const DEFAULT_SLIPPAGE = 0.5 // .5%

const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const errorData = {
    location: "actions.swap"
}

const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]

const approveAndSwapInterface = new ContractInterface(APPROVE_AND_SWAP_ABI)

export const _swap = (params: SwapParams): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        params.slippage = params.slippage ? params.slippage : 1
        const chain = await getChainFromData(actionData.chain)
        const walletAddress = await actionData.wallet.getAddress()
        if (oneInchSupported.includes(parseInt(await chain.getChainId()))) {
            const data = await _1inchSwap(params, walletAddress, actionData.options)
            if (!data.approveTx) {
                return { data: data.swapTx, errorData }
            } else {
                return await approveAndExec({ approve: data.approveTx, exec: data.swapTx })(actionData)
            }
        }
        if (uniswapV3Supported.includes(parseInt(await chain.getChainId()))) {
            return await _uniswapSwap(params, walletAddress, actionData.options)(actionData)
        } else {
            return await _uniswapV2Swap(params, walletAddress, actionData.options)(actionData)
        }
    }
}

const _uniswapSwap = (params: UniswapParams, address: Address, options: EnvOption): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        const client = await actionData.chain.getClient()
        const tokenSwapAddress = await actionData.chain.getAddress("tokenSwapAddress")
        const univ3quoter = await actionData.chain.getAddress("univ3quoter")
        const univ3factory = await actionData.chain.getAddress("univ3factory")
        const univ3router = await actionData.chain.getAddress("univ3router")
        const tokenIn = new Token(params.in)
        const tokenOut = new Token(params.out)

        const tokenInAddress = await tokenIn.getAddress(options)
        const tokenOutAddress = await tokenOut.getAddress(options)

        const uniswapAddrs: UniswapV3Addrs = {
            univ3quoter,
            univ3factory,
            univ3router
        }

        if (!params.returnAddress) {
            params.returnAddress = address
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
        const chainId = Number(await actionData.chain.getChainId())

        const { data, to, amount } = await swapExec(client, uniswapAddrs, swapParams, chainId)
        let swapData
        if (tokenIn.isNative) {
            swapData = await approveAndSwapInterface.encodeTransactionData(tokenSwapAddress, "executeSwapETH", [to, amount, data])
        } else {
            swapData = await approveAndSwapInterface.encodeTransactionData(tokenSwapAddress, "executeSwapERC20", [
                tokenInAddress,
                univ3router,
                amount,
                data
            ])
        }
        const txData = { to: tokenSwapAddress, data: swapData.data }
        return { data: txData, errorData }
    }
}

const _uniswapV2Swap = (params: UniswapParams, address: Address, options: EnvOption): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        const client = await actionData.chain.getClient()
        const tokenSwapAddress = await actionData.chain.getAddress("tokenSwapAddress")
        const factory = await actionData.chain.getAddress("UniswapV2Factory")
        const router = await actionData.chain.getAddress("UniswapV2Router02")

        const tokenIn = new Token(params.in)
        const tokenOut = new Token(params.out)

        const tokenInAddress = await tokenIn.getAddress(options)
        const tokenOutAddress = await tokenOut.getAddress(options)

        const uniswapAddrs: UniswapV2Addrs = {
            factory,
            router
        }

        if (!params.returnAddress) {
            params.returnAddress = address
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
        const chainId = Number(await actionData.chain.getChainId())

        const { data, to, amount } = await swapExecV2(client, uniswapAddrs, swapParams, chainId)
        let swapData
        if (tokenIn.isNative) {
            swapData = await approveAndSwapInterface.encodeTransactionData(tokenSwapAddress, "executeSwapETH", [to, amount, data])
        } else {
            swapData = await approveAndSwapInterface.encodeTransactionData(tokenSwapAddress, "executeSwapERC20", [
                tokenInAddress,
                router,
                amount,
                data
            ])
        }
        const txData = { to: tokenSwapAddress, data: swapData.data }
        return { data: txData, errorData }
    }
}

const _1inchSwap = async (swapParams: OneInchSwapParams, address: string, options: EnvOption): Promise<OneInchSwapReturn> => {
    let approveTx: TransactionData | undefined

    const inToken = new Token(swapParams.in)
    const outToken = new Token(swapParams.out)
    if (inToken.isNative) {
        swapParams.in = eth1InchAddress
    } else {
        approveTx = await _getOneInchApproveTx(swapParams.in, swapParams.amount, options)
    }
    if (outToken.isNative) {
        swapParams.out = eth1InchAddress
    }
    const swapTx = await _getOneInchSwapTx(swapParams, address, options)
    return { approveTx, swapTx }
}

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
