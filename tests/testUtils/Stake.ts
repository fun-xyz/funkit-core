import { assert, expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface StakeTestConfig {
    chainId: number
    actualChainId: number
    baseToken: string
    steth: string
    prefundAmt: number
    stakeAmt: number
    numRetry?: number
}

export const StakeTest = (config: StakeTestConfig) => {
    const { baseToken, prefundAmt } = config

    describe("Stake", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(120_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(1799811349)
            })

            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.002)
            }
            chain = await Chain.getChain({ chainIdentifier: config.chainId })
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress(), chain)) < config.stakeAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.002)
            }
        })

        it("wallet should have lower balance of gas token", async () => {
            const walletAddress = await wallet.getAddress()
            const balBefore = await Token.getBalanceBN(baseToken, walletAddress, chain)
            const userOp = await wallet.stake(auth, await auth.getAddress(), { amount: config.stakeAmt })
            expect(await wallet.executeOperation(auth, userOp)).to.not.throw
            await new Promise((resolve) => {
                setTimeout(resolve, 5000)
            })
            const balAfter = await Token.getBalanceBN(baseToken, walletAddress, chain)
            assert(balAfter < balBefore, "unable to stake")
        })

        it("Should be able to start unstaking", async () => {
            const userOp = await wallet.unstake(auth, await auth.getAddress(), {
                amounts: [config.stakeAmt],
                recipient: await wallet.getAddress()
            })
            if (config.chainId === 36865) {
                const receipt = await wallet.executeOperation(auth, userOp)
                assert(receipt.txId !== null && receipt.txId !== undefined, "unable to start unstaking")
            } else {
                const withdrawalsBefore: any = await wallet.getAssets(config.actualChainId.toString(), false, true)
                expect(await wallet.executeOperation(auth, userOp)).to.not.throw
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
                const balBefore = await Token.getBalance(baseToken, await wallet.getAddress(), chain)
                const userOp = await wallet.unstake(auth, await auth.getAddress(), {
                    recipient: await wallet.getAddress(),
                    walletAddress: await wallet.getAddress()
                })
                expect(await wallet.executeOperation(auth, userOp)).to.not.throw
                const balAfter = await Token.getBalance(baseToken, await wallet.getAddress(), chain)
                assert(balAfter > balBefore, "unable to finish unstaking")
            } else {
                try {
                    const userOp = await wallet.unstake(auth, await auth.getAddress(), {
                        recipient: await wallet.getAddress(),
                        walletAddress: await wallet.getAddress()
                    })
                    expect(await wallet.executeOperation(auth, userOp)).to.not.throw
                    assert(false, "Did not throw error")
                } catch (error: any) {
                    assert(error.message.includes("Not ready to withdraw requests"), "Incorrect StatusError")
                }
            }
        })
    })
}
