import * as dotenv from "dotenv"
import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
dotenv.config()

const config: TransferTestConfig = {
    chainId: 36865,
    outToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    amount: 1,
    baseToken: "eth",
    prefund: true,
    prefundAmt: 10,
    numRetry: 5
}
TransferTest(config)
