const { TransferTest } = require('../testUtils/Transfer.js')
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 42161,
    authPrivateKey: WALLET_PRIVATE_KEY,
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    baseToken: "eth",
    prefund: PREFUND,
    index:0,
    amount:0.00001
}
TransferTest(config)