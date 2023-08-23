import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 137,
    prefundAmt: 0.2
}
FactoryTest(config)
