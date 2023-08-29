import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const config: GaslessSponsorTestConfig = {
    chainId: 8453,
    stakeAmount: 0.06,
    baseToken: "eth",
    sponsorBalance: 0.04
}

GaslessSponsorTest(config)
