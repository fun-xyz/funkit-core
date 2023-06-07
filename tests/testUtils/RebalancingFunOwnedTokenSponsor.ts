import { assert } from "chai"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { TokenSponsor } from "../../src/sponsors"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
export interface RebalancingFunOwnedTokenSponsorTestConfig {
    chainId: number
    inToken: string
    outToken: string
    paymasterToken: string
    baseTokenStakeAmt: number
    paymasterTokenStakeAmt: number
    prefund: boolean
    swapAmount: number
    stake: boolean
    walletIndex: number
    funderIndex: number
}

export const RebalancingFunOwnedTokenSponsorTest = (config: RebalancingFunOwnedTokenSponsorTestConfig) => {
    const paymasterToken = config.paymasterToken

    describe("TokenSponsor", function () {
        this.timeout(300_000)
        let auth: Eoa
        let funder: Eoa
        let funderAddress: string
        let wallet: FunWallet
        let wallet1: FunWallet
        before(async function () {
            // Configure Environment
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId.toString(),
                apiKey: apiKey
            }
            // Deploy FunWallets and configure authorizations
            auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })
            funder = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            await configureEnvironment(options)
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.walletIndex })
            wallet1 = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.funderIndex })

            // if (config.prefund) {
            //     await fundWallet(funder, wallet, config.baseTokenStakeAmt)
            //     await fundWallet(auth, wallet1, config.baseTokenStakeAmt)
            // }
            // const walletAddress = await wallet.getAddress()
            // const walletAddress1 = await wallet1.getAddress()
            // funderAddress = await funder.getUniqueId()

            // // Send some paymaster tokens to the funder
            // await wallet.swap(auth, {
            //     in: config.inToken,
            //     amount: config.swapAmount,
            //     out: paymasterToken,
            //     returnAddress: funderAddress
            // })
            // // Configure the enviroment to use the tokenPaymaster
            // await configureEnvironment({
            //     gasSponsor: {
            //         sponsorAddress: funderAddress,
            //         token: paymasterToken
            //     }
            // })

            // // Create a new token sponsor
            // const gasSponsor = new TokenSponsor()
            // const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
            // const depositInfo1S = await gasSponsor.getTokenBalance("eth", funderAddress)

            // // Stake some tokens for wallet and wallet1
            // const approve = await gasSponsor.approve(paymasterToken, config.paymasterTokenStakeAmt * 2)
            // const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, config.paymasterTokenStakeAmt)
            // const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, config.paymasterTokenStakeAmt)
            // const data = await gasSponsor.stake(funderAddress, config.baseTokenStakeAmt)
            // await funder.sendTxs([approve, deposit, deposit1, data])

            // // Check to make sure token sponsor's paymaster token and eth balances have increased
            // const depositInfoE = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
            // const depositInfo1E = await gasSponsor.getTokenBalance("eth", funderAddress)
            // assert(depositInfo1E.gt(depositInfo1S), "Base Stake Failed")
            // assert(depositInfoE.gt(depositInfoS), "Token Stake Failed")
        })

        // Swap inToken for outToken using paymaster
        const runSwap = async (wallet: FunWallet) => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            await wallet.swap(auth, {
                in: config.inToken,
                amount: config.swapAmount,
                out: config.outToken
            })
            const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        it("Blacklist Mode Approved", async () => {
            // Configure Environment
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId.toString(),
                apiKey: apiKey,
                gasSponsor: {
                    sponsorAddress: funderAddress,
                    token: paymasterToken
                }
            }
            await configureEnvironment(options)
            const gasSponsor = new TokenSponsor()

            // console.log("set sponsor to blacklistmode", await funder.sendTx(await gasSponsor.setToBlacklistMode()))
            // await runSwap(wallet)

            // Get a list of all tokens in the paymaster
            const tokens = await gasSponsor.getAllTokens()
            for (const token of tokens) {
                const amount = await gasSponsor.getTokenBalance(token, await wallet1.getAddress())
                console.log("amount", amount)
                if (amount.eq(0)) continue

                const unlockTx = await gasSponsor.unlockTokenDepositAfter(token, 1)
                console.log(await auth.sendTx(unlockTx))

                // unstake Token all tokens belonging to paymaster
                const unstake = await gasSponsor.unstakeToken(token, await wallet1.getAddress(), amount)
                await auth.sendTx(unstake)
                console.log("Unstake Token", unstake)

                // swap these tokens for eth
                const swap = await wallet1.swap(auth, {
                    in: token,
                    amount: amount,
                    out: "eth"
                })
                console.log("SWAP", swap)
                // addEthDepositTo
                const stake = await gasSponsor.stake(await wallet1.getAddress(), amount)
                const stakeTx = await funder.sendTx(stake)
                console.log("STAKE", stakeTx)
            }
        })
    })
}
