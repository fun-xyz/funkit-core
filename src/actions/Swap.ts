import { Address, isAddress } from "viem"
import { OneInchSwapParams, SwapParams, UniswapPoolFeeOptions } from "./types"
import { get1InchAllowance, get1InchApproveTx, get1InchSwapTx } from "../apis/SwapApis"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, APPROVE_AND_SWAP_ABI, TransactionParams } from "../common"
import { EnvOption } from "../config"
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

const getOneInchApproveTx = async (oneInchSwapParams: OneInchSwapParams): Promise<TransactionParams | null> => {
    const allowance = await get1InchAllowance(oneInchSwapParams.chainId.toString(), oneInchSwapParams.src, oneInchSwapParams.from)
    if (Number(allowance) < Number(oneInchSwapParams.amount)) {
        const approveTx = await get1InchApproveTx(oneInchSwapParams.chainId.toString(), oneInchSwapParams.src, oneInchSwapParams.amount)
        return approveTx
    }
    return null
}

const getOneInchSwapTx = async (oneinchSwapParams: OneInchSwapParams): Promise<TransactionParams> => {
    return await get1InchSwapTx(
        oneinchSwapParams.chainId.toString(),
        oneinchSwapParams.src.toString(),
        oneinchSwapParams.dst.toString(),
        oneinchSwapParams.amount.toString(),
        oneinchSwapParams.from.toString(),
        oneinchSwapParams.slippage.toString(),
        oneinchSwapParams.disableEstimate.toString(),
        oneinchSwapParams.allowPartialFill.toString()
    )
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
    const swapTx = await getOneInchSwapTx(oneinchSwapParams)
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
        poolFee: params.poolFee ?? UniswapPoolFeeOptions.medium
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
        poolFee: params.poolFee ?? UniswapPoolFeeOptions.medium
    }
    const chainId = Number(await chain.getChainId())

    const { data, to, amount } = await swapExecV2(client, uniswapAddrs, swapParams, chainId)

    if (tokenIn.isNative) {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapETH", [to, amount, data])
    } else {
        return approveAndSwapInterface.encodeTransactionParams(tokenSwapAddress, "executeSwapERC20", [tokenInAddress, amount, data])
    }
}
