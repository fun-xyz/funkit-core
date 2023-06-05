import * as dotenv from "dotenv"
import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: PREFUND,
    swapAmount: 0.001,
    stake: false
}
TokenSponsorTest(config)
