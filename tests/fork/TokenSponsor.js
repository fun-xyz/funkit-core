const { TokenSponsorTest } = require("../testUtils/TokenSponsor.ts")
const { keys, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } = require("../../src/common/constants")

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: keys.TEST_PRIVATE_KEY,
    funderPrivateKey: keys.FUNDER_PRIVATE_KEY,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 1,
    stake: true
}
TokenSponsorTest(config)
