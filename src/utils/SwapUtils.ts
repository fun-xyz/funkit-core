import { ethers } from "ethers"
import { CurrencyAmount, Percent, Token, TradeType, Currency } from "@uniswap/sdk-core"
import { FeeAmount, Pool, Route, SwapQuoter, SwapRouter, Trade, computePoolAddress } from "@uniswap/v3-sdk"
import { JSBI } from "@uniswap/sdk"
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"
import { Provider } from "@ethersproject/providers"
import { getChainFromData } from "../data"
import { EnvOption } from "../config"

const ERC20 = require("../abis/ERC20.json")
const apiBaseUrl = "https://api.1inch.io/v5.0/"

export function fromReadableAmount(amount: number, decimals: number) {
    return ethers.utils.parseUnits(amount.toString(), decimals)
}

class SwapToken {
    provider: Provider
    quoterContractAddr: string
    poolFactoryContractAddr: string

    constructor(provider: Provider, quoterContractAddr: string, poolFactoryContractAddr: string) {
        this.provider = provider
        this.quoterContractAddr = quoterContractAddr
        this.poolFactoryContractAddr = poolFactoryContractAddr
    }

    async getOutputQuote(route: Route<Currency, Currency>, token0: Token, amountIn: number) {
        const { calldata } = await SwapQuoter.quoteCallParameters(
            route,
            CurrencyAmount.fromRawAmount(token0, fromReadableAmount(amountIn, token0.decimals).toString()),
            TradeType.EXACT_INPUT,
            {
                useQuoterV2: true
            }
        )

        const quoteCallReturnData = await this.provider.call({
            to: this.quoterContractAddr,
            data: calldata
        })
        return ethers.utils.defaultAbiCoder.decode(["uint256"], quoteCallReturnData)
    }

    async getPoolInfo(tokenIn: Token, tokenOut: Token, poolFee: FeeAmount) {
        const currentPoolAddress = computePoolAddress({
            factoryAddress: this.poolFactoryContractAddr,
            tokenA: tokenIn,
            tokenB: tokenOut,
            fee: poolFee
        })

        const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI.abi, this.provider)

        const [token0, token1, fee, tickSpacing, liquidity, slot0] = await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.tickSpacing(),
            poolContract.liquidity(),
            poolContract.slot0()
        ])

        return {
            token0,
            token1,
            fee,
            tickSpacing,
            liquidity,
            sqrtPriceX96: slot0[0],
            tick: slot0[1]
        }
    }

    async getTokenDecimals(tokenAddr: string) {
        const contract = new ethers.Contract(tokenAddr, ERC20.abi, this.provider)
        return await contract.decimals()
    }

    async createTrade(amountIn: number, tokenIn: Token, tokenOut: Token, poolFee: FeeAmount) {
        const poolInfo = await this.getPoolInfo(tokenIn, tokenOut, poolFee)
        const pool = new Pool(tokenIn, tokenOut, poolFee, poolInfo.sqrtPriceX96.toString(), poolInfo.liquidity.toString(), poolInfo.tick)
        const swapRoute = new Route([pool], tokenIn, tokenOut)

        const amountOut = await this.getOutputQuote(swapRoute, tokenIn, amountIn)
        const tokenInAmount = fromReadableAmount(amountIn, tokenIn.decimals).toString()
        const uncheckedTrade = Trade.createUncheckedTrade({
            route: swapRoute,
            inputAmount: CurrencyAmount.fromRawAmount(tokenIn, tokenInAmount),
            outputAmount: CurrencyAmount.fromRawAmount(tokenOut, JSBI.BigInt(amountOut)),
            tradeType: TradeType.EXACT_INPUT
        })

        return { uncheckedTrade, tokenInAmount }
    }

    executeTrade(
        trade: Trade<Currency, Currency, TradeType>,
        routerAddr: string,
        walletAddress: string,
        slippage = 5000,
        percentDec = 10000
    ) {
        const options = {
            slippageTolerance: new Percent(slippage, percentDec), // 50 bips, or 0.50%
            deadline: Date.now() + 1800, // 20 minutes from the current Unix time
            recipient: walletAddress
        }

        const { calldata, value } = SwapRouter.swapCallParameters(trade, options)
        return {
            data: calldata,
            to: routerAddr,
            value: value
        }
    }
}

const fees = {
    lowest: 100,
    low: 500,
    medium: 3000,
    high: 10000
}

export async function swapExec(provider: Provider, uniswapAddrs: any, swapParams: any) {
    const { univ3quoter, univ3factory, univ3router } = uniswapAddrs

    const { tokenInAddress, tokenOutAddress, amountIn, returnAddress, percentDecimal, slippage, poolFee } = swapParams
    const _poolFee = (fees as any)[poolFee]

    const swapper = new SwapToken(provider, univ3quoter, univ3factory)
    const { chainId } = await provider.getNetwork()
    const tokenInDecimal = await swapper.getTokenDecimals(tokenInAddress)
    const tokenOutDecimal = await swapper.getTokenDecimals(tokenOutAddress)

    const tokenIn = new Token(chainId, tokenInAddress, tokenInDecimal)
    const tokenOut = new Token(chainId, tokenOutAddress, tokenOutDecimal)

    const { uncheckedTrade, tokenInAmount } = await swapper.createTrade(amountIn, tokenIn, tokenOut, _poolFee)
    const data = swapper.executeTrade(uncheckedTrade, univ3router, returnAddress, slippage, percentDecimal)
    return { ...data, amount: tokenInAmount }
}

const testIds = [36864, 31337]
export async function oneInchAPIRequest(methodName: string, queryParams: any, options: EnvOption = (globalThis as any).globalEnvOption) {
    const chain = await getChainFromData(options.chain)
    const chainId = testIds.includes(Number(chain.id)) ? 1 : chain.id
    return apiBaseUrl + chainId + methodName + "?" + new URLSearchParams(queryParams).toString()
}
