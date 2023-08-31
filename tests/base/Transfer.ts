import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 8453,
    outToken: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    baseToken: "eth",
    index: 0,
    amount: 0.000001,
    prefundAmt: 0.001,
    outTokenPrefund: 0.0001
}

TransferTest(config)
