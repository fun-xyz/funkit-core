import { StakeTest, StakeTestConfig } from "../testUtils/Stake"
import * as dotenv from "dotenv"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: StakeTestConfig = {
    chainId: 5,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    baseToken: "eth",
    prefund: PREFUND,
    steth: "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
}
StakeTest(config)
