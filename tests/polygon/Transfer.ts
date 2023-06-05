import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const DAI_POLYGON = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const config: TransferTestConfig = {
    chainId: 137,
    outToken: DAI_POLYGON,
    baseToken: "matic",
    prefund: true
}

TransferTest(config)
