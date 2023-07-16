import * as dotenv from "dotenv"
import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"
dotenv.config()

const config: TransferTestConfig = {
    chainId: 36865,
    outToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    amount: 1,
    baseToken: "eth",
    prefund: true,
    prefundAmt: 10,
    numRetry: 0
}
TransferTest(config)
