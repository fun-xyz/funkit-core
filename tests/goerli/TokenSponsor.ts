import * as dotenv from "dotenv"
import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TokenSponsorTestConfig = {
    chainId: 5,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    funderPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 0.61,
    paymasterTokenStakeAmt: 100,
    prefund: PREFUND,
    swapAmount: 0.01,
    stake: false
}
TokenSponsorTest(config)
