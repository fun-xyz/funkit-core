const { SwapTest } = require("../testUtils/Swap.js")
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === "true" ? true : false
const config = {
    chainId: 42161,
    authPrivateKey: WALLET_PRIVATE_KEY,
    inToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    outToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    baseToken: "eth",
    prefund: PREFUND,
    amount: 0.00001,
    index: 0
}
SwapTest(config)
