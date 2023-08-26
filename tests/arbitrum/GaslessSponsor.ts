import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const config: GaslessSponsorTestConfig = {
    chainId: 42161,
    inToken: "eth",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    stakeAmount: 0.001,
    prefund: true,
    amount: 0.00001,
    walletIndex: 0,
    funderIndex: 1,
    baseToken: "eth"
}

GaslessSponsorTest(config)
