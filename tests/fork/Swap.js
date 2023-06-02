const { SwapTest } = require("../testUtils/Swap")
const { keys, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../src/common/constants")

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: keys.TEST_PRIVATE_KEY,
    inToken: "usdc",
    outToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    baseToken: "eth",
    prefund: true
}

SwapTest(config)
