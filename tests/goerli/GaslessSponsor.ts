import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: GaslessSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.0005,
    prefund: PREFUND
}
GaslessSponsorTest(config)
