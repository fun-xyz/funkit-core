import * as dotenv from "dotenv"
import { StakeTest, StakeTestConfig } from "../testUtils/Stake"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: StakeTestConfig = {
    chainId: 5,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    baseToken: "eth",
    prefund: PREFUND
}
StakeTest(config)
