import { FaucetTest, FaucetTestConfig } from "../testUtils/Faucet"

const config: FaucetTestConfig = {
    chainId: 5,
    numRetry: 0
}
FaucetTest(config)
