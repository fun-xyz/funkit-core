import { assert } from "chai"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { TokenSponsor } from "../../src/sponsors"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../getTestApiKey"

export interface TokenSponsorTestConfig {
    chainId: number
    authPrivateKey: string
    funderPrivateKey: string
    inToken: string
    outToken: string
    paymasterToken: string
    baseTokenStakeAmt: number
    paymasterTokenStakeAmt: number
    prefund: boolean
    swapAmount: number
    stake: boolean
    walletIndex?: number
    funderIndex?: number
}

export const TokenSponsorTest = (config: TokenSponsorTestConfig) => {
    const paymasterToken = config.paymasterToken

    describe("TokenSponsor", function () {
        this.timeout(300_000)
        const auth = new Eoa({ privateKey: config.authPrivateKey })
        const funder = new Eoa({ privateKey: config.funderPrivateKey })
        let wallet: FunWallet
        let wallet1: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId.toString(),
                apiKey: apiKey
            }

            await configureEnvironment(options)

            const uniqueId = await auth.getUniqueId()

            wallet = new FunWallet({ uniqueId, index: config.walletIndex ? config.walletIndex : 1223452391856341 })
            wallet1 = new FunWallet({ uniqueId, index: config.funderIndex ? config.funderIndex : 2345234 })

            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()

            const funderAddress = await funder.getUniqueId()

            if (config.prefund) {
                await fundWallet(funder, wallet, 0.5)
                await fundWallet(auth, wallet1, 0.5)
            }
            // try {
            //     await wallet.swap(auth, {
            //         in: config.inToken,
            //         amount: config.swapAmount,
            //         out: paymasterToken
            //         // returnAddress: funderAddress
            //     })
            // } catch (e) {
            //     console.log(e)
            // }

            await configureEnvironment({
                gasSponsor: {
                    sponsorAddress: funderAddress,
                    token: paymasterToken
                }
            })

            const gasSponsor = new TokenSponsor()

            const baseStakeAmount = config.baseTokenStakeAmt
            const paymasterTokenStakeAmount = config.paymasterTokenStakeAmt

            const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
            const depositInfo1S = await gasSponsor.getTokenBalance("eth", funderAddress)
            console.log(depositInfo1S)

            const approve = await gasSponsor.approve(paymasterToken, paymasterTokenStakeAmount * 2)
            const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, paymasterTokenStakeAmount)
            const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, paymasterTokenStakeAmount)
            const whiteListToken = await gasSponsor.addWhitelistTokens(paymasterToken, true)
            const data = await gasSponsor.stake(funderAddress, baseStakeAmount)

            await funder.sendTxs([approve, deposit, deposit1, whiteListToken, data])
            const depositInfoE = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
            const depositInfo1E = await gasSponsor.getTokenBalance("eth", funderAddress)

            assert(depositInfo1E.gt(depositInfo1S), "Base Stake Failed")
            assert(depositInfoE.gt(depositInfoS), "Token Stake Failed")
        })

        const runSwap = async (wallet: FunWallet) => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            console.log("asfjkasjdfkajsdf")
            try {
                await wallet.swap(auth, {
                    in: config.inToken,
                    amount: config.swapAmount,
                    out: config.outToken
                })
            } catch (e) {
                console.log(e)
            }
            const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        // it("Only User Whitelisted", async () => {
        //     const walletAddress = await wallet.getAddress()
        //     const walletAddress1 = await wallet1.getAddress()
        //     const gasSponsor = new TokenSponsor()
        //     console.log(await funder.sendTx(await gasSponsor.setToWhitelistMode()))
        //     await funder.sendTx(await gasSponsor.addSpenderToWhiteList(walletAddress))
        //     await funder.sendTx(await gasSponsor.removeSpenderFromWhiteList(walletAddress1))
        //     await runSwap(wallet)
        //     try {
        //         await runSwap(wallet1)
        //         throw new Error("Wallet is not whitelisted but transaction passed")
        //     } catch (error: any) {
        //         assert(error.message.includes("AA33"), "Error but not AA33\n" + JSON.stringify(error))
        //     }
        // })

        it("Blacklist Mode Approved", async () => {
            const gasSponsor = new TokenSponsor()
            const funder = new Eoa({ privateKey: config.funderPrivateKey })
            const funderAddress = await funder.getUniqueId()

            await funder.sendTx(await gasSponsor.setToBlacklistMode())
            await configureEnvironment({
                gasSponsor: {
                    sponsorAddress: funderAddress,
                    token: paymasterToken
                }
            })

            await runSwap(wallet)
        })
    })
}
