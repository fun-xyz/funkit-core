import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
import * as dotenv from "dotenv"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: GaslessSponsorTestConfig = {
    chainId: 137,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    funderPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    inToken: "matic",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: PREFUND
}

GaslessSponsorTest(config)
