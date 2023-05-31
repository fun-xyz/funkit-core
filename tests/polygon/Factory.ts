import * as dotenv from "dotenv"
import { FactoryTest, FactoryTestConfig } from "../testUtils/Factory"
dotenv.config()

const config: FactoryTestConfig = {
    chainId: 137,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!
}

FactoryTest(config)
