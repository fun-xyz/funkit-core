import * as dotenv from "dotenv"
import { FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID } from "../../src/common/constants"
import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
dotenv.config()

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config: TransferTestConfig = {
    chainId: FORK_CHAIN_ID,
    outToken: "usdc",
    baseToken: "eth",
    prefund: true
}

TransferTest(config)
