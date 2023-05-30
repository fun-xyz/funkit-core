import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
import * as dotenv from "dotenv"
dotenv.config()

const DAI_POLYGON = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TransferTestConfig = {
    chainId: 137,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY_2!,
    outToken: DAI_POLYGON,
    baseToken: "matic",
    prefund: PREFUND
}

TransferTest(config)
