import * as dotenv from "dotenv"
import { FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID } from "../../src/common/constants"
import { SwapTest, SwapTestConfig } from "../testUtils/Swap"
dotenv.config()

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config: SwapTestConfig = {
    chainId: FORK_CHAIN_ID,
    inToken: "usdc",
    outToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    baseToken: "eth",
    prefund: true
}

SwapTest(config)
