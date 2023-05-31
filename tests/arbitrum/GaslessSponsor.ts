import * as dotenv from "dotenv"
import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: GaslessSponsorTestConfig = {
    chainId: 42161,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    funderPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    inToken: "eth",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    stakeAmount: 0.01,
    prefund: PREFUND,
    amount: 0.00001,
    walletIndex: 0,
    funderIndex: 1
}

GaslessSponsorTest(config)
