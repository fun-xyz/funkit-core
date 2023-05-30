import { FactoryTestConfig, FactoryTest } from "../testUtils/Factory"
import * as dotenv from "dotenv"
dotenv.config()

const config: FactoryTestConfig = {
    chainId: 137,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!
}

FactoryTest(config)
