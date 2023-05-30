import { SwapTest, SwapTestConfig } from "../testUtils/Swap"
import * as dotenv from "dotenv"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: SwapTestConfig = {
    chainId: 5,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    prefund: PREFUND
}
SwapTest(config)
