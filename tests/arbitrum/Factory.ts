import * as dotenv from "dotenv"
import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"
dotenv.config()

const config: FactoryTestConfig = {
    chainId: 42161,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    testCreate: false,
    prefundAmt: 0.012
}

FactoryTest(config)