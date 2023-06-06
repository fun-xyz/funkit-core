import * as dotenv from "dotenv"
import { StakeTest, StakeTestConfig } from "../testUtils/Stake"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: StakeTestConfig = {
    chainId: 36865,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    baseToken: "eth",
    prefund: PREFUND,
    steth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
}
StakeTest(config)
