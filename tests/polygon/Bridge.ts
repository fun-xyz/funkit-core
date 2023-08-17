import { BridgeTest, BridgeTestConfig } from "../testUtils/Bridge"

const config: BridgeTestConfig = {
    fromChainId: 137,
    toChainId: 100,
    fromToken: "usdc",
    toToken: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", // usdc on gnosis chain
    amountToBridge: 1,
    baseToken: "matic",
    walletCreationCost: 0.3
}
// fromChainId: number
// toChainId: number
// outToken: string
// fromToken: string
// toToken: string
// amountToBridge: number
// baseToken: string
// walletCreationCost: number
// index?: number
// numRetry?: number
BridgeTest(config)
