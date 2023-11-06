import { BridgeTest, BridgeTestConfig } from "../testUtils/Bridge"

const config: BridgeTestConfig = {
    fromChainId: 137,
    toChainId: 8453,
    fromToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // usdc on polygon
    toToken: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // usdc on gnosis chain
    // amountToBridge: 0.4,
    amountToBridge: 1,
    baseToken: "matic",
    walletCreationCost: 3
}
BridgeTest(config)
