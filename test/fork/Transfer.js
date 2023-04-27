const { TransferTest } = require('../testUtils/Transfer');
const { TEST_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../utils")
var REMOTE_TEST = process.env.REMOTE_TEST;
const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID

const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: TEST_PRIVATE_KEY,
    outToken: "usdc",
    baseToken: "eth",
    prefund: true
}
TransferTest(config)
