import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 1,
    prefundAmt: 0.025
}
FactoryTest(config)
