import { FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID } from "../../src/common/constants"
import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config: FactoryTestConfig = {
    chainId: FORK_CHAIN_ID
}

FactoryTest(config)
