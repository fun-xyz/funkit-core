import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 36865,
    prefundAmt: 1,
    numRetry: 5
}
FactoryTest(config)
