import { assert } from "chai"
import { Hex } from "viem"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface StakeTestConfig {
    chainId: number
    actualChainId: number
    baseToken: string
    prefund: boolean
    steth: string
    amount?: number
    numRetry?: number
}

export const StakeTest = (config: StakeTestConfig) => {
    const { baseToken, prefund } = config

    describe("Stake", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(120_000)
        let auth: Auth
        let wallet: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
            if (prefund) await fundWallet(auth, wallet, config.amount ? config.amount : 0.002)
        })

        it("wallet should have lower balance of gas token", async () => {
            const walletAddress = await wallet.getAddress()
            const balBefore = await Token.getBalance(baseToken, walletAddress)
            const userOp = await wallet.stake(auth, "", { amount: 0.01, chainId: config.actualChainId })
            await wallet.executeOperation(auth, userOp)
            const balAfter = await Token.getBalance(baseToken, walletAddress)
            assert(balAfter < balBefore, "unable to stake")
        })

        it("Should be able to start unstaking", async () => {
            const withdrawalsBefore = await wallet.getAssets(false, true)
            const userOp = await wallet.unstake(auth, "", {
                amounts: [0.001],
                recipient: await wallet.getAddress(),
                chainId: config.actualChainId
            })
            await wallet.executeOperation(auth, userOp)
            const withdrawalsAfter = await wallet.getAssets(false, true)
            assert(withdrawalsAfter[1].length > withdrawalsBefore[1].length, "unable to start unstaking")
        })

        it("Should be able to finish unstaking if ready", async () => {
            const withdrawals = await wallet.getAssets(false, true)
            if (withdrawals[0].length > 0) {
                const balBefore = await Token.getBalance(baseToken, await wallet.getAddress())
                const userOp = await wallet.unstake(auth, "", {
                    recipient: await wallet.getAddress(),
                    walletAddress: await wallet.getAddress(),
                    chainId: config.actualChainId
                })
                await wallet.executeOperation(auth, userOp)
                const balAfter = await Token.getBalance(baseToken, await wallet.getAddress())
                assert(balAfter > balBefore, "unable to finish unstaking")
            } else {
                try {
                    const userOp = await wallet.finishUnstake(auth, {
                        recipient: await wallet.getAddress(),
                        walletAddress: await wallet.getAddress(),
                        chainId: config.actualChainId
                    })
                    await wallet.executeOperation(auth, userOp)
                } catch (error: any) {
                    assert(error.message.substring(0, 12) === "Lido Finance", "Incorrect StatusError")
                    return
                }
                assert(false, "Did not throw error")
            }
        })
    })
}
