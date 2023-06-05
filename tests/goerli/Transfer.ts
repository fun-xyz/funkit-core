import * as dotenv from "dotenv"
import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TransferTestConfig = {
    chainId: 5,
    outToken: "dai",
    baseToken: "eth",
    prefund: PREFUND
}
TransferTest(config)
