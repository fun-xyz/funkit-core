import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const config: GaslessSponsorTestConfig = {
    chainId: 42161,
    baseToken: "eth",
    stakeAmount: 0.001,
    walletIndex: 0,
    funderIndex: 1
}

GaslessSponsorTest(config)
