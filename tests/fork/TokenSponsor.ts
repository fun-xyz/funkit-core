import * as dotenv from "dotenv"
import { FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID } from "../../src/common/constants"
import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"
dotenv.config()

var REMOTE_TEST = process.env.REMOTE_TEST
const FORK_CHAIN_ID = REMOTE_TEST === "true" ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
const config: TokenSponsorTestConfig = {
    chainId: FORK_CHAIN_ID,
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
