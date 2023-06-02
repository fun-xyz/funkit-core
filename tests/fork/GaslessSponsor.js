const { GaslessSponsorTest } = require("../testUtils/GaslessSponsor.ts")
const { keys, FUNDER_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../src/common/constants")

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: keys.TEST_PRIVATE_KEY,
    funderPrivateKey: keys.FUNDER_PRIVATE_KEY,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 100,
    prefund: true
}
GaslessSponsorTest(config)
