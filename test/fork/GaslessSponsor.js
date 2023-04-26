const { GaslessSponsorTest } = require('../testUtils/GaslessSponsor.js')
var REMOTE_TEST = process.env.REMOTE_TEST;
const { TEST_PRIVATE_KEY, FUNDER_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../utils/index.js")
const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: TEST_PRIVATE_KEY,
    funderPrivateKey: FUNDER_PRIVATE_KEY,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: true
}
GaslessSponsorTest(config)