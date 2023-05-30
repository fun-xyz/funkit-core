import { Contract, constants } from "ethers"
import { Interface } from "ethers/lib/utils"
import { Token } from "../data/Token"
import { swapExec, fromReadableAmount } from "../utils/swap"
import { oneInchAPIRequest } from "../utils/swap"
import { sendRequest } from "../utils"
import { approveAndExec } from "./ApproveAndExec"
import { ActionData } from "./FirstClass"
import { EnvOption } from "../config"
import { getChainFromData } from "../data"

const approveAndSwapAbi = require("../abis/ApproveAndSwap.json").abi
const approveAndSwapInterface = new Interface(approveAndSwapAbi)
const initData = approveAndSwapInterface.encodeFunctionData("init", [constants.HashZero])

const DEFAULT_SLIPPAGE = 0.5 // .5%

const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const errorData = {
    location: "actions.swap"
}

const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]

export enum UniSwapPoolFeeOptions {
    lowest = "lowest",
    low = "low",
    medium = "medium",
    high = "high"
}

export interface SwapParams {
    in: string
    out: string
    amount: number
    slippage?: number
    returnAddress?: string
}

export interface OneInchSwapParams extends SwapParams {
    disableEstimate?: boolean
    allowPartialFill?: boolean
}

export interface UniSwapParams extends SwapParams {
    poolFee?: UniSwapPoolFeeOptions
    percentDecimal?: number
}

export const _swap = (params: SwapParams) => {
    return async (actionData: ActionData) => {
        params.slippage = params.slippage ? params.slippage : 1

        const address = await actionData.wallet.getAddress()
        if (oneInchSupported.includes(parseInt(actionData.chain.id!))) {
            const data = await _1inchSwap(params, address, actionData.options)
            if (!data.approveTx) {
                return { data: data.swapTx, errorData }
            } else {
                return await approveAndExec({ approve: data.approveTx, exec: data.swapTx })(actionData)
            }
        }
        return await _uniswapSwap(params, address, actionData.options)(actionData)
    }
}

const _uniswapSwap = (params: UniSwapParams, address: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
    return async (actionData: ActionData) => {
        const provider = await actionData.chain.getProvider()

        const tokenSwapAddress = await actionData.chain.getAddress("tokenSwapAddress")
        const univ3quoter = await actionData.chain.getAddress("univ3quoter")
        const univ3factory = await actionData.chain.getAddress("univ3factory")
        const univ3router = await actionData.chain.getAddress("univ3router")

        const actionContract = new Contract(tokenSwapAddress, approveAndSwapAbi, provider)

        const tokenIn = new Token(params.in)
        const tokenOut = new Token(params.out)

        const tokenInAddress = await tokenIn.getAddress(options)
        const tokenOutAddress = await tokenOut.getAddress(options)

        const uniswapAddrs = {
            univ3quoter,
            univ3factory,
            univ3router
        }

        if (!params.returnAddress) {
            params.returnAddress = address
        }

        let percentDecimal = 100
        let slippage = params.slippage ? params.slippage : DEFAULT_SLIPPAGE
        while (slippage < 1 || Math.trunc(slippage) != slippage) {
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
        const { data, to, amount } = await swapExec(provider, uniswapAddrs, swapParams)
        let swapData
        if (tokenIn.isNative) {
            swapData = await actionContract.populateTransaction.executeSwapETH(to, amount, data)
        } else {
            swapData = await actionContract.populateTransaction.executeSwapERC20(tokenInAddress, univ3router, amount, data)
        }
        const txData = { to: tokenSwapAddress, data: [initData, swapData.data], initAndExec: true }
        return { data: txData, errorData }
    }
}

const _1inchSwap = async (swapParams: OneInchSwapParams, address: string, options: EnvOption = (globalThis as any).globalEnvOption) => {
    let approveTx = undefined
    const chain = await getChainFromData(options.chain)
    if (swapParams.in.toUpperCase() == chain.currency) {
        swapParams.in = eth1InchAddress
    } else {
        approveTx = await _getOneInchApproveTx(swapParams.in, swapParams.amount, options)
    }
    if (swapParams.out.toUpperCase() == chain.currency) {
        swapParams.out = eth1InchAddress
    }
    const swapTx = await _getOneInchSwapTx(swapParams, address, options)
    return { approveTx, swapTx }
}

const _getOneInchApproveTx = async (tokenAddress: string, amt: number, options: EnvOption) => {
    let inTokenDecimals = await _get1inchTokenDecimals(tokenAddress, options)
    tokenAddress = await Token.getAddress(tokenAddress, options)
    const amount = fromReadableAmount(amt, inTokenDecimals).toString()
    const url = await oneInchAPIRequest("/approve/transaction", amount ? { tokenAddress, amount } : { tokenAddress })
    const transaction = await sendRequest(url, "GET", "")
    return transaction
}

const _getOneInchSwapTx = async (swapParams: OneInchSwapParams, address: string, options: EnvOption) => {
    let inTokenDecimals = await _get1inchTokenDecimals(swapParams.in, options)
    const fromTokenAddress = await Token.getAddress(swapParams.in, options)
    const toTokenAddress = await Token.getAddress(swapParams.out, options)
    const amount = fromReadableAmount(swapParams.amount, inTokenDecimals)
    const formattedSwap = {
        fromTokenAddress,
        toTokenAddress,
        amount: amount,
        fromAddress: address,
        slippage: swapParams.slippage,
        disableEstimate: swapParams.disableEstimate ? swapParams.disableEstimate : true,
        allowPartialFill: swapParams.allowPartialFill ? swapParams.allowPartialFill : false,
        destReceiver: swapParams.returnAddress ? swapParams.returnAddress : undefined
    }

    const url = await oneInchAPIRequest("/swap", formattedSwap)
    const res = await sendRequest(url, "GET", "")
    return res.tx
}

const _get1inchTokenDecimals = async (tokenAddress: string, options: EnvOption) => {
    if (tokenAddress != eth1InchAddress) {
        const inToken = new Token(tokenAddress)
        return await inToken.getDecimals(options)
    }

    return 18
}
