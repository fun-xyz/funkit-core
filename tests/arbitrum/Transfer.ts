import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 42161,
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    baseToken: "eth",
    prefund: true,
    index: 0,
    amount: 0.0000001,
    prefundAmt: 0.01
}

TransferTest(config)
