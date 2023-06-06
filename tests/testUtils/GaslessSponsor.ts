import { assert } from "chai"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { GaslessSponsor } from "../../src/sponsors"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../getTestApiKey"

export interface GaslessSponsorTestConfig {
    chainId: number
    authPrivateKey: string
    funderPrivateKey: string
    inToken: string
    outToken: string
    stakeAmount: number
    prefund: boolean
    amount?: number
    walletIndex?: number
    funderIndex?: number
}

export const GaslessSponsorTest = (config: GaslessSponsorTestConfig) => {
    const auth = new Eoa({ privateKey: config.authPrivateKey })
    describe("GaslessSponsor", function () {
        this.timeout(250_000)
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

            const uid = await auth.getUniqueId()
            wallet = new FunWallet({ uniqueId: uid, index: config.walletIndex ? config.walletIndex : 129856341 })
            wallet1 = new FunWallet({ uniqueId: uid, index: config.funderIndex ? config.funderIndex : 12341238465411 })
            if (config.prefund) {
                await fundWallet(funder, wallet, 0.5)
                await fundWallet(auth, wallet1, 0.5)
            }
            console.log("asjdkj")
            const funderAddress = await funder.getUniqueId()
            try {
                await wallet.swap(auth, {
                    in: config.inToken,
                    amount: config.amount ? config.amount : 0.01,
                    out: config.outToken,
                    returnAddress: funderAddress
                })
            } catch (e) {
                console.log(e)
            }

            console.log("asjdkj")

            await configureEnvironment({
                gasSponsor: {
                    sponsorAddress: funderAddress
                }
            })
            const gasSponsor = new GaslessSponsor()

            const depositInfo1S = await gasSponsor.getBalance(funderAddress)
            const stake = await gasSponsor.stake(funderAddress, config.stakeAmount)
            await funder.sendTx(stake)
            const depositInfo1E = await gasSponsor.getBalance(funderAddress)
            console.log("asjdkj")

            assert(depositInfo1E.gt(depositInfo1S), "Stake Failed")
        })

        const runSwap = async (wallet: FunWallet) => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            if (Number(tokenBalanceBefore) < 0.1) {
                try {
                    await wallet.swap(auth, {
                        in: config.inToken,
                        amount: config.amount ? config.amount : 0.1,
                        out: config.outToken
                    })
                } catch (e) {
                    console.log(e)
                }

                const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            }
        }

        it("Only User Whitelisted", async () => {
            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()

            const gasSponsor = new GaslessSponsor()
            await funder.sendTx(await gasSponsor.setToWhitelistMode())
            await funder.sendTx(await gasSponsor.addSpenderToWhiteList(walletAddress))
            await funder.sendTx(await gasSponsor.removeSpenderFromWhiteList(walletAddress1))
            await runSwap(wallet)

            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(error.message.includes("AA33"), "Error but not AA33\n" + JSON.stringify(error))
            }
        })

        it("Blacklist Mode Approved", async () => {
            const gasSponsor = new GaslessSponsor()
            await funder.sendTx(await gasSponsor.setToBlacklistMode())
            await runSwap(wallet)
        })
    })
}
