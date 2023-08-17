import { BridgeTest, BridgeTestConfig } from "../testUtils/Bridge"

const config: BridgeTestConfig = {
    fromChainId: 137,
    toChainId: 100,
    fromToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // usdc on polygon
    toToken: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", // usdc on gnosis chain
    amountToBridge: 0.02,
    baseToken: "matic",
    walletCreationCost: 1
}
BridgeTest(config)
