import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 42161,
    testCreate: false,
    prefundAmt: 0.001
}

FactoryTest(config)
