import * as dotenv from "dotenv"
import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TokenSponsorTestConfig = {
    chainId: 36865,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    funderPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    inToken: "eth",
    outToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    paymasterToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: PREFUND,
    swapAmount: 1,
    stake: true
}
TokenSponsorTest(config)
