import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
import { LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } from "../../src/common/constants"
import * as dotenv from "dotenv"
dotenv.config()

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config: GaslessSponsorTestConfig = {
    chainId: FORK_CHAIN_ID,
    authPrivateKey: process.env.TEST_PRIVATE_KEY!,
    funderPrivateKey: process.env.FUNDER_PRIVATE_KEY!,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: true
}

GaslessSponsorTest(config)
