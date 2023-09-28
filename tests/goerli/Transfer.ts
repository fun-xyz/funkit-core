import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 5,
    outToken: "0x0a1F0598A561af6b84A726bE007f581E812C3CDD",
    baseToken: "eth",
    prefundAmt: 0.2,
    index: 123123
}
TransferTest(config)
