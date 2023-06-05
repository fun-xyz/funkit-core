import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const DAI_POLYGON = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const USDC_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
const config: SwapTestConfig = {
    chainId: 137,
    inToken: DAI_POLYGON,
    outToken: USDC_POLYGON,
    baseToken: "matic",
    prefund: true
}

SwapTest(config)
