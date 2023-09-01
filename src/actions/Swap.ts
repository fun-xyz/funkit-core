import fetch from "node-fetch"
import { Address, isAddress } from "viem"
import { OneInchSwapParams, SwapParams, UniSwapPoolFeeOptions } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, APPROVE_AND_SWAP_ABI, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { ErrorCode, InvalidParameterError } from "../errors"
import { sendRequest } from "../utils"
import { UniswapV2Addrs, UniswapV3Addrs, oneInchAPIRequest, swapExec, swapExecV2 } from "../utils/SwapUtils"
import { ContractInterface } from "../viem/ContractInterface"

export const oneInchSupported: number[] = [137]
export const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
const DEFAULT_SLIPPAGE = 0.5 // .5%
const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const ONE_INCH_API_KEY = "mOBW0CLnyH5HMaxY3O6xY75PPe0uHC9q"
const approveAndSwapInterface = new ContractInterface(APPROVE_AND_SWAP_ABI)

const getOneInchApproveTx = async (oneInchSwapParams: OneInchSwapParams): Promise<TransactionParams | null> => {
    const url = await oneInchAPIRequest(
        "approve/allowance",
        {
            tokenAddress: oneInchSwapParams.src,
            walletAddress: oneInchSwapParams.from
        },
        oneInchSwapParams.chainId
    )
    const allowance = (
        await (
            await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${ONE_INCH_API_KEY}` // notice the Bearer before your token
                }
            })
        ).json()
    )["allowance"]
    if (Number(allowance) < Number(oneInchSwapParams.amount)) {
        const approveTxURL = await oneInchAPIRequest(
            "/approve/transaction",
            {
                tokenAddress: oneInchSwapParams.src,
                amount: oneInchSwapParams.amount
            },
            oneInchSwapParams.chainId
        )
        const approveTx = await (
            await fetch(approveTxURL, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${ONE_INCH_API_KEY}` // notice the Bearer before your token
                }
            })
        ).json()
        const transaction = {
            to: approveTx.to,
            value: approveTx.value,
            data: approveTx.data
        }
        return transaction
    }
    return null
}

const getOneInchSwapTx = async (oneinchSwapParams: OneInchSwapParams): Promise<TransactionParams> => {
    const formattedData = {
        src: oneinchSwapParams.src,
        dst: oneinchSwapParams.dst,
        amount: oneinchSwapParams.amount,
        from: oneinchSwapParams.from,
        slippage: oneinchSwapParams.slippage,
        disableEstimate: oneinchSwapParams.disableEstimate,
        allowPartialFill: oneinchSwapParams.allowPartialFill
    }
    console.log("Reached")
    const url = await oneInchAPIRequest("/swap", formattedData, oneinchSwapParams.chainId)
    console.log(url)
    const res = await sendRequest(url, "GET", "")
    console.log("getOneInchSwapTx", res)
    return {
        to: res.tx.to,
        value: Number(res.tx.value),
        data: res.tx.data
    }
}

export const oneInchTransactionParams = async (
    params: SwapParams,
    walletAddress: Address,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    if (!oneInchSupported.includes(Number(await chain.getChainId()))) {
        throw new InvalidParameterError(
            ErrorCode.ChainNotSupported,
            "Incorrect chainId, oneInch only available on Ethereum mainnet and polygon",
            { params },
            "Provide correct chainId.",
            "https://docs.fun.xyz"
        )
    }
    if (!isAddress(params.recipient ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }

    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    const inToken = new Token(params.tokenIn)
    const outToken = new Token(params.tokenOut)

    const inTokenAddress = inToken.isNative ? eth1InchAddress : await inToken.getAddress()
    const outTokenAddress = outToken.isNative ? eth1InchAddress : await outToken.getAddress()
    const oneinchSwapParams: OneInchSwapParams = {
        src: inTokenAddress,
        dst: outTokenAddress,
        amount: (await inToken.getDecimalAmount(params.inAmount)).toString(),
        from: walletAddress,
        slippage: params.slippage ?? DEFAULT_SLIPPAGE,
        disableEstimate: true,
        allowPartialFill: false,
        chainId: Number(await chain.getChainId())
    }

    const approveTx = await getOneInchApproveTx(oneinchSwapParams)
    console.log("approveTx from main", approveTx)
    if (!approveTx) {
        const swapTx = await getOneInchSwapTx(oneinchSwapParams)
        return { to: approveAndExecAddress, value: params.inAmount, data: swapTx.data }
    } else {
        const swapTx = await getOneInchSwapTx(oneinchSwapParams)
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
    if (!isAddress(params.recipient ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }

    const swapParams = {
        tokenInAddress,
        tokenOutAddress,
        amountIn: params.inAmount,
        // optional
        recipient: params.recipient! as Address,
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
        amountIn: params.inAmount,
        // optional
        recipient: params.recipient! as Address,
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
