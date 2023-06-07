import {
    RebalancingFunOwnedTokenSponsorTest,
    RebalancingFunOwnedTokenSponsorTestConfig
} from "../testUtils/RebalancingFunOwnedTokenSponsor"

const config: RebalancingFunOwnedTokenSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 0.001,
    stake: false,
    walletIndex: 1223452391856341,
    funderIndex: 2345234
}
RebalancingFunOwnedTokenSponsorTest(config)
