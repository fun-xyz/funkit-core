const { AlphaRouter } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { JSBI } = require('@uniswap/sdk');
const ethers = require("ethers")

const { Module } = require("./Module")

const ERC20 = require("../../utils/abis/ERC20.json");
const { swapExec } = require('./SwapUtils');

// const typedValueParsed = '10000000000000';
// const usdcxAmount = CurrencyAmount.fromRawAmount(MATIC, JSBI.BigInt(typedValueParsed));

// const route = router.route(
//     usdcxAmount,
//     USDC,
//     TradeType.EXACT_INPUT,
//     {
//         recipient: address,
//         slippageTolerance: new Percent(5, 100),
//         deadline: 100,
//     },
// );

class Swap extends Module {
    wallet = {}
    noInit = true

    create() {
        return {
            type: "SWAP",
        }
    }

    async createNew(tokenInAddress, tokenOutAddress, amountIn, slippage = 5, percentDec = 100) {
        const txs = await swapExec(tokenInAddress, tokenOutAddress, amountIn, this.eoaAddr, this.chain, slippage, percentDec)
        
    }

}



module.exports = { Swap }