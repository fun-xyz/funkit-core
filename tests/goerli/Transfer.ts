import * as dotenv from "dotenv"
import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TransferTestConfig = {
    chainId: 36865,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    outToken: "dai",
    baseToken: "eth",
    prefund: PREFUND
}
TransferTest(config)
