import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: GaslessSponsorTestConfig = {
    chainId: 36865,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    funderPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    inToken: "eth",
    outToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    stakeAmount: 1,
    prefund: PREFUND
}
GaslessSponsorTest(config)
