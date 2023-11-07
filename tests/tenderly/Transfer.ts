import * as dotenv from "dotenv"
import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
dotenv.config()

const config: TransferTestConfig = {
    chainId: 36865,
    outToken: "usdc",
    amount: 1,
    baseToken: "eth",
    prefundAmt: 10,
    numRetry: 0,
    index: 19928113499999
}
TransferTest(config)
