import { JSBI } from "@uniswap/sdk"
import { Currency, CurrencyAmount, Percent, Token, TradeType } from "@uniswap/sdk-core"
import { FeeAmount, Pool, Route, SwapQuoter, SwapRouter, Trade, computePoolAddress } from "@uniswap/v3-sdk"
import { Address, Hex, PublicClient, decodeAbiParameters, parseUnits } from "viem"
import { ERC20_CONTRACT_INTERFACE, POOL_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { getChainFromData } from "../data"
const apiBaseUrl = "https://api.1inch.io/v5.0/"

export function fromReadableAmount(amount: number, decimals: number) {
    return parseUnits(`${amount}`, decimals)
}

class SwapToken {
    client: PublicClient
    quoterContractAddr: Address
    poolFactoryContractAddr: string

    constructor(client: PublicClient, quoterContractAddr: Address, poolFactoryContractAddr: string) {
        this.client = client
        this.quoterContractAddr = quoterContractAddr
        this.poolFactoryContractAddr = poolFactoryContractAddr
    }

    async getOutputQuote(route: Route<Currency, Currency>, token0: Token, amountIn: number): Promise<BigInt> {
        const { calldata } = await SwapQuoter.quoteCallParameters(
            route,
            CurrencyAmount.fromRawAmount(token0, fromReadableAmount(amountIn, token0.decimals).toString()),
            TradeType.EXACT_INPUT,
            {
                useQuoterV2: true
            }
        )

        const quoteCallReturnData = await this.client.call({
            to: this.quoterContractAddr,
            data: calldata as Hex
        })
        if (!quoteCallReturnData.data) {
            throw new Error("No data returned from quote call")
        }
        return BigInt(decodeAbiParameters([{ name: "return", type: "uint256" }], quoteCallReturnData.data)[0])
    }

    async getPoolInfo(tokenIn: Token, tokenOut: Token, poolFee: FeeAmount) {
        const currentPoolAddress = computePoolAddress({
            factoryAddress: this.poolFactoryContractAddr,
            tokenA: tokenIn,
            tokenB: tokenOut,
            fee: poolFee
        })

        const [token0, token1, fee, tickSpacing, liquidity, slot0] = await POOL_CONTRACT_INTERFACE.batchReadFromChain(
            currentPoolAddress as Address,
            this.client,
            [
                {
                    functionName: "token0"
                },
                {
                    functionName: "token1"
                },
                {
                    functionName: "fee"
                },
                {
                    functionName: "tickSpacing"
                },
                {
                    functionName: "liquidity"
                },
                {
                    functionName: "slot0"
                }
            ]
        )

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

    async getTokenDecimals(tokenAddr: Address) {
        return await ERC20_CONTRACT_INTERFACE.readFromChain(tokenAddr, "decimals", [], this.client)
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
            outputAmount: CurrencyAmount.fromRawAmount(tokenOut, JSBI.BigInt(amountOut.toString())),
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

type SwapParamsUtils = {
    tokenInAddress: Address
    tokenOutAddress: Address
    amountIn: number
    returnAddress: Address
    percentDecimal: number
    slippage: number
    poolFee: string
}
type UniswapAddrs = {
    univ3quoter: Address
    univ3factory: Address
    univ3router: Address
}
export async function swapExec(client: PublicClient, uniswapAddrs: UniswapAddrs, swapParams: SwapParamsUtils, chainId: number) {
    const { univ3quoter, univ3factory, univ3router } = uniswapAddrs

    const { tokenInAddress, tokenOutAddress, amountIn, returnAddress, percentDecimal, slippage, poolFee } = swapParams
    const _poolFee = fees[poolFee]

    const swapper = new SwapToken(client, univ3quoter, univ3factory)
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
