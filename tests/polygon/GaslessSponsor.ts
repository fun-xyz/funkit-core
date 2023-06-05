import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: GaslessSponsorTestConfig = {
    chainId: 137,
    inToken: "matic",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: PREFUND
}

GaslessSponsorTest(config)
