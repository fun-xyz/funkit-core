import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"
import * as dotenv from "dotenv"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TokenSponsorTestConfig = {
    chainId: 137,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    funderPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    inToken: "matic",
    outToken: "dai",
    paymasterToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 1,
    prefund: PREFUND,
    swapAmount: 0.01,
    stake: true
}

TokenSponsorTest(config)
