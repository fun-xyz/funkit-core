const { TokenSponsorTest } = require('../testUtils/TokenSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 42161,
    authPrivateKey: WALLET_PRIVATE_KEY,
    funderPrivateKey: WALLET_PRIVATE_KEY_2,
    inToken: "eth",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    paymasterToken: "0x53589543A64408AA03ba709EFCD1a7f03AA6880D",
    baseTokenStakeAmt: 0.02,
    paymasterTokenStakeAmt: 1000,
    prefund: PREFUND,
    swapAmount: .00001,
    stake: true,
    walletIndex: 0,
    funderIndex: 1
    
}
TokenSponsorTest(config)