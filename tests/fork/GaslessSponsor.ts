import * as dotenv from "dotenv"
import { FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID } from "../../src/common/constants"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config: GaslessSponsorTestConfig = {
    chainId: FORK_CHAIN_ID,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: true
}

GaslessSponsorTest(config)
