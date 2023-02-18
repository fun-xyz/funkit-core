const { ethers } = require("ethers")
const { CurrencyAmount, Percent, Token, TradeType } = require('@uniswap/sdk-core')
const { Pool, Route, SwapQuoter, SwapRouter, Trade, FeeAmount, computePoolAddress, } = require('@uniswap/v3-sdk')
const { JSBI } = require('@uniswap/sdk');
const ERC20 = require("./abis/ERC20.json")
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

function fromReadableAmount(amount, decimals) {
    return ethers.utils.parseUnits(amount.toString(), decimals)
}

// Helper Quoting and Pool Functions
class SwapToken {

    constructor(provider, quoterContractAddr, poolFactoryContractAddr) {
        this.provider = provider
        this.quoterContractAddr = quoterContractAddr
        this.poolFactoryContractAddr = poolFactoryContractAddr
    }

    async getOutputQuote(route, token0, amountIn) {
        const { calldata } = await SwapQuoter.quoteCallParameters(
            route,
            CurrencyAmount.fromRawAmount(
                token0,
                fromReadableAmount(amountIn, token0.decimals).toString()
            ),
            TradeType.EXACT_INPUT,
            {
                useQuoterV2: true,
            }
        )

        const quoteCallReturnData = await this.provider.call({
            to: this.quoterContractAddr,
            data: calldata,
        })

        return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)
    }

    async getPoolInfo(tokenIn, tokenOut, poolFee,) {
        const currentPoolAddress = computePoolAddress({
            factoryAddress: this.poolFactoryContractAddr,
            tokenA: tokenIn,
            tokenB: tokenOut,
            fee: poolFee,
        })

        const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI.abi, this.provider)

        const [token0, token1, fee, tickSpacing, liquidity, slot0] =
            await Promise.all([
                poolContract.token0(),
                poolContract.token1(),
                poolContract.fee(),
                poolContract.tickSpacing(),
                poolContract.liquidity(),
                poolContract.slot0(),
            ])

        return {
            token0,
            token1,
            fee,
            tickSpacing,
            liquidity,
            sqrtPriceX96: slot0[0],
            tick: slot0[1],
        }
    }

    async getTokenDecimals(tokenAddr) {
        const contract = new ethers.Contract(tokenAddr, ERC20.abi, this.provider)
        return (await contract.decimals())
    }

    async createTrade(amountIn, tokenIn, tokenOut, poolFee) {
        const poolInfo = await this.getPoolInfo(tokenIn, tokenOut, poolFee)
        const pool = new Pool(tokenIn, tokenOut, poolFee, poolInfo.sqrtPriceX96.toString(), poolInfo.liquidity.toString(), poolInfo.tick)
        const swapRoute = new Route([pool], tokenIn, tokenOut)

        const amountOut = await this.getOutputQuote(swapRoute, tokenIn, amountIn)
        const tokenInAmount = fromReadableAmount(
            amountIn,
            tokenIn.decimals
        ).toString()
        const uncheckedTrade = Trade.createUncheckedTrade({
            route: swapRoute,
            inputAmount: CurrencyAmount.fromRawAmount(
                tokenIn,
                tokenInAmount
            ),
            outputAmount: CurrencyAmount.fromRawAmount(
                tokenOut,
                JSBI.BigInt(amountOut)
            ),
            tradeType: TradeType.EXACT_INPUT,
        })

        return { uncheckedTrade, tokenInAmount }
    }

    executeTrade(trade, routerAddr, walletAddress, slippage = 5000, percentDec = 10000) {
        const options = {
            slippageTolerance: new Percent(slippage, percentDec), // 50 bips, or 0.50%
            deadline: Date.now() + 1800,// 20 minutes from the current Unix time
            recipient: walletAddress,
        }

        const { calldata, value } = SwapRouter.swapCallParameters(trade, options)
        return {
            data: calldata,
            to: routerAddr,
            value: value,
        }
    }
}

async function swapExec(provider, quoterContractAddr, poolFactoryContractAddr, routerAddr, tokenInAddress, 
    tokenOutAddress, amountIn, returnAddr, slippage, percentDec, poolFee = FeeAmount.MEDIUM) {
    const swapper = new SwapToken(provider, quoterContractAddr, poolFactoryContractAddr)
    const { chainId } = await provider.getNetwork()
    const tokenInDecimal = await swapper.getTokenDecimals(tokenInAddress)
    const tokenOutDecimal = await swapper.getTokenDecimals(tokenOutAddress)

    const tokenIn = new Token(chainId, tokenInAddress, tokenInDecimal);
    const tokenOut = new Token(chainId, tokenOutAddress, tokenOutDecimal);

    const { uncheckedTrade, tokenInAmount } = await swapper.createTrade(amountIn, tokenIn, tokenOut, poolFee)
    const data = swapper.executeTrade(uncheckedTrade, routerAddr, returnAddr, slippage, percentDec)
    return { ...data, amount: tokenInAmount }
}

module.exports = { swapExec }