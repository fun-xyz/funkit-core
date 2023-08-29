import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 8453,
    testCreate: false,
    prefundAmt: 0.001
}

FactoryTest(config)
