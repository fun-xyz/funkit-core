const { GaslessSponsorTest } = require("../testUtils/GaslessSponsor.js")
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")
const PREFUND = process.env.PREFUND === "true" ? true : false
const config = {
    chainId: 137,
    authPrivateKey: WALLET_PRIVATE_KEY,
    funderPrivateKey: WALLET_PRIVATE_KEY_2,
    inToken: "matic",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: PREFUND
}

GaslessSponsorTest(config)
