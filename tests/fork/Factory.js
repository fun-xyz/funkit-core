const { FactoryTest } = require("../testUtils/Factory.ts")

const { keys, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../src/common/constants")

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: keys.TEST_PRIVATE_KEY
}
FactoryTest(config)