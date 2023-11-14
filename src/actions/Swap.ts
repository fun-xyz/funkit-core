import { Address, isAddress } from "viem"
import { OneInchSwapParams, SwapParams, UniswapPoolFeeOptions } from "./types"
import { get1InchAllowance, get1InchApproveTx, get1InchSwapTx } from "../apis/SwapApis"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, APPROVE_AND_SWAP_ABI, TransactionParams } from "../common"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { ErrorCode, InvalidParameterError } from "../errors"
import { UniswapV2Addrs, UniswapV3Addrs, swapExec, swapExecV2 } from "../utils/SwapUtils"
import { ContractInterface } from "../viem/ContractInterface"

export const oneInchSupported: number[] = [1, 10, 56, 137, 8453, 42161]
export const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
const DEFAULT_SLIPPAGE = 0.5 // .5%
const eth1InchAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const approveAndSwapInterface = new ContractInterface(APPROVE_AND_SWAP_ABI)

const getOneInchApproveTx = async (oneInchSwapParams: OneInchSwapParams, chainId: String): Promise<TransactionParams | null> => {
    const allowance = await get1InchAllowance(oneInchSwapParams.chainId.toString(), oneInchSwapParams.src, oneInchSwapParams.from)
    if (Number(allowance) < Number(oneInchSwapParams.amount)) {
        const approveTx = await get1InchApproveTx(chainId.toString(), oneInchSwapParams.src, oneInchSwapParams.amount)
        return approveTx
    }
    return null
}

const getOneInchSwapTx = async (oneinchSwapParams: OneInchSwapParams, chainId: String): Promise<TransactionParams> => {
    return await get1InchSwapTx(
        chainId.toString(),
        oneinchSwapParams.src.toString(),
        oneinchSwapParams.dst.toString(),
        oneinchSwapParams.amount.toString(),
        oneinchSwapParams.from.toString(),
        oneinchSwapParams.slippage.toString(),
        oneinchSwapParams.disableEstimate.toString(),
        oneinchSwapParams.allowPartialFill.toString()
    )
}

export const oneInchTransactionParams = async (params: SwapParams, walletAddress: Address, chain: Chain): Promise<TransactionParams> => {
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

    if (!(params.tokenIn instanceof Token) || !(params.tokenOut instanceof Token)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "TokenIn and TokenOut must be Token object",
            { params },
            "Please provide Token object",
            "https://docs.fun.xyz"
        )
    }

    const inToken = params.tokenIn
    const outToken = params.tokenOut

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

    const approveTx = await getOneInchApproveTx(oneinchSwapParams, chain.getChainId())
    const swapTx = await getOneInchSwapTx(oneinchSwapParams, chain.getChainId())
    if (!approveTx) {
        return swapTx
    } else {
        return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
            swapTx.to,
            swapTx.value,
            swapTx.data,
            inTokenAddress,
            approveTx.data
        ])
    }
}

export const uniswapV3SwapTransactionParams = async (params: SwapParams, chain: Chain): Promise<TransactionParams> => {
    const client = await chain.getClient()
    const tokenSwapAddress = chain.getAddress("tokenSwapAddress")
    const univ3quoter = chain.getAddress("univ3quoter")
    const univ3factory = chain.getAddress("univ3factory")
    const univ3router = chain.getAddress("univ3router")

    if (!(params.tokenIn instanceof Token) || !(params.tokenOut instanceof Token)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "TokenIn and TokenOut must be Token object",
            { params },
            "Please provide Token object",
            "https://docs.fun.xyz"
        )
    }

    const tokenInAddress = await params.tokenIn.getAddress()
    const tokenOutAddress = await params.tokenOut.getAddress()

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
        poolFee: params.poolFee ?? UniswapPoolFeeOptions.medium
    }

    const { data, amount } = await swapExec(client, uniswapAddrs, swapParams, Number(await chain.getChainId()))
    if (params.tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}

export const uniswapV2SwapTransactionParams = async (params: SwapParams, chain: Chain, apiKey: string): Promise<TransactionParams> => {
    const client = await chain.getClient()
    const tokenSwapAddress = await chain.getAddress("tokenSwapAddress")
    const factory = await chain.getAddress("UniswapV2Factory")
    const router = await chain.getAddress("UniswapV2Router02")

    if (!(params.tokenIn instanceof Token) || !(params.tokenOut instanceof Token)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "TokenIn and TokenOut must be Token object",
            { params },
            "Please provide Token object",
            "https://docs.fun.xyz"
        )
    }

    const tokenInAddress = await params.tokenIn.getAddress()
    const tokenOutAddress = await params.tokenOut.getAddress()

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
        poolFee: params.poolFee ?? UniswapPoolFeeOptions.medium
    }
    const chainId = Number(await chain.getChainId())

    const { data, to, amount } = await swapExecV2(client, uniswapAddrs, swapParams, chainId, apiKey)

    if (params.tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [to, amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}
