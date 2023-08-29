import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 10,
    prefundAmt: 0.003
}
FactoryTest(config)
