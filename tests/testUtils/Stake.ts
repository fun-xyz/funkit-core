import { assert } from "chai"
import { Auth } from "../../src/auth"
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
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), 1792811340)
            })
            if (prefund) await fundWallet(auth, wallet, config.amount ? config.amount : 0.002)
        })

        it("wallet should have lower balance of gas token", async () => {
            const walletAddress = await wallet.getAddress()
            const balBefore = await Token.getBalanceBN(baseToken, walletAddress)
            const userOp = await wallet.stake(auth, await auth.getAddress(), { amount: 0.01, chainId: config.actualChainId })
            await wallet.executeOperation(auth, userOp)
            await new Promise((resolve) => {
                setTimeout(resolve, 5000)
            })
            const balAfter = await Token.getBalanceBN(baseToken, walletAddress)
            assert(balAfter < balBefore, "unable to stake")
        })

        it("Should be able to start unstaking", async () => {
            const userOp = await wallet.unstake(auth, await auth.getAddress(), {
                amounts: [0.001],
                recipient: await wallet.getAddress(),
                chainId: config.actualChainId
            })
            if (config.chainId === 36865) {
                const receipt = await wallet.executeOperation(auth, userOp)
                assert(receipt.txId !== null && receipt.txId !== undefined, "unable to start unstaking")
            } else {
                const withdrawalsBefore: any = await wallet.getAssets(config.actualChainId.toString(), false, true)
                await wallet.executeOperation(auth, userOp)
                const withdrawalsAfter: any = await wallet.getAssets(config.actualChainId.toString(), false, true)
                assert(
                    withdrawalsAfter.lidoWithdrawals[1].length > withdrawalsBefore.lidoWithdrawals[1].length,
                    "unable to start unstaking"
                )
            }
        })

        it("Should be able to finish unstaking if ready", async () => {
            let withdrawals: any
            if (config.chainId === 36865) {
                withdrawals = [[]]
            } else {
                const assets: any = await wallet.getAssets(config.actualChainId.toString(), false, true)
                withdrawals = assets.lidoWithdrawals
            }
            if (withdrawals[0].length > 0) {
                const balBefore = await Token.getBalance(baseToken, await wallet.getAddress())
                const userOp = await wallet.unstake(auth, await auth.getAddress(), {
                    recipient: await wallet.getAddress(),
                    walletAddress: await wallet.getAddress(),
                    chainId: config.actualChainId
                })
                await wallet.executeOperation(auth, userOp)
                const balAfter = await Token.getBalance(baseToken, await wallet.getAddress())
                assert(balAfter > balBefore, "unable to finish unstaking")
            } else {
                try {
                    const userOp = await wallet.unstake(auth, await auth.getAddress(), {
                        recipient: await wallet.getAddress(),
                        walletAddress: await wallet.getAddress(),
                        chainId: config.actualChainId
                    })
                    await wallet.executeOperation(auth, userOp)
                    assert(false, "Did not throw error")
                } catch (error: any) {
                    assert(error.message.includes("Not ready to withdraw requests"), "Incorrect StatusError")
                }
            }
        })
    })
}
