const { ethers } = require("ethers")
const { Currency, CurrencyAmount, Percent, Token, TradeType, } = require('@uniswap/sdk-core')
const { Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade, FeeAmount, computePoolAddress, } = require('@uniswap/v3-sdk')
const { JSBI } = require('@uniswap/sdk');

const ERC20 = require("../../utils/abis/ERC20.json")
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

const ALCHEMY_HTTP_ENDPOINT = "http://localhost:8545"
const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_HTTP_ENDPOINT)

const POOL_FACTORY_CONTRACT_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const QUOTER_CONTRACT_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"


// const tokenIn = USDC
// const tokenOut = DAI

// Trading Functions



async function createTrade(amountIn, tokenIn, tokenOut, poolFee) {
    const poolInfo = await getPoolInfo(tokenIn, tokenOut, poolFee)
    const pool = new Pool(tokenIn, tokenOut, poolFee, poolInfo.sqrtPriceX96.toString(), poolInfo.liquidity.toString(), poolInfo.tick)
    const swapRoute = new Route([pool], tokenIn, tokenOut)

    const amountOut = await getOutputQuote(swapRoute, tokenIn, amountIn)

    const uncheckedTrade = Trade.createUncheckedTrade({
        route: swapRoute,
        inputAmount: CurrencyAmount.fromRawAmount(
            tokenIn,
            fromReadableAmount(
                amountIn,
                tokenIn.decimals
            ).toString()
        ),
        outputAmount: CurrencyAmount.fromRawAmount(
            tokenOut,
            JSBI.BigInt(amountOut)
        ),
        tradeType: TradeType.EXACT_INPUT,
    })

    return uncheckedTrade
}

async function executeTrade(trade, walletAddress, slippage = 500, percentDec = 10000) {
    // Give approval to the router to spend the token
    const options = {
        slippageTolerance: new Percent(slippage, percentDec), // 50 bips, or 0.50%
        deadline: Math.floor(Date.now() / 1000 + 1800),// 20 minutes from the current Unix time
        recipient: walletAddress,
    }

    const methodParameters = SwapRouter.swapCallParameters(trade, options)

    const tx = {
        data: methodParameters.calldata,
        to: SWAP_ROUTER_ADDRESS,
        value: methodParameters.value,
    }

    return tx
}

// Helper Quoting and Pool Functions

async function getOutputQuote(route, token0, amountIn) {
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

    const quoteCallReturnData = await provider.call({
        to: QUOTER_CONTRACT_ADDRESS,
        data: calldata,
    })

    return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)
}

async function getTokenTransferApproval(token, amount) {
    const tokenContract = new ethers.Contract(token.address, ERC20.abi)
    return await tokenContract.populateTransaction.approve(SWAP_ROUTER_ADDRESS, fromReadableAmount(amount, token.decimals))
}

async function getPoolInfo(tokenIn, tokenOut, poolFee,) {
    const currentPoolAddress = computePoolAddress({
        factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
        tokenA: tokenIn,
        tokenB: tokenOut,
        fee: poolFee,
    })

    const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI.abi, provider)

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

function fromReadableAmount(amount, decimals) {
    return ethers.utils.parseUnits(amount.toString(), decimals)
}

const getTokenDecimals = async (tokenAddr, provider) => {
    const contract = new ethers.Contract(tokenAddr, ERC20.abi, provider)
    return (await contract.decimals())
}

const swapExec = async (tokenInAddress, tokenOutAddress, amountIn, returnAddr, chainId, slippage = 5, percentDec = 100, poolFee = FeeAmount.MEDIUM,) => {
    const tokenInDecimal = await getTokenDecimals(tokenInAddress, provider)
    const tokenOutDecimal = await getTokenDecimals(tokenOutAddress, provider)

    const tokenIn = new Token(chainId, tokenInAddress, tokenInDecimal);
    const tokenOut = new Token(chainId, tokenOutAddress, tokenOutDecimal);

    const trade = await createTrade(amountIn, tokenIn, tokenOut, poolFee)
    const tokenApprovalTx = await getTokenTransferApproval(tokenIn, amountIn)
    const executeTransaction = await executeTrade(trade, returnAddr, slippage, percentDec)
    return [tokenApprovalTx, executeTransaction]
}

module.exports = { swapExec }