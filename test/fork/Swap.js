const { SwapTest } = require('../testUtils/Swap');
const { TEST_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../utils")

var REMOTE_TEST = process.env.REMOTE_TEST;
const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: TEST_PRIVATE_KEY,
    inToken:"dai",
    outToken: "usdc",
    baseToken: "eth",
    prefund: true
}
SwapTest(config)
