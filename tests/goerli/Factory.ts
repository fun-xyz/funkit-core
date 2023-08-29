import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"

const config: FactoryTestConfig = {
    chainId: 5,
    prefundAmt: 0.2
}
FactoryTest(config)
