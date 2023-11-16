import { expect } from "chai"
import { SocketSort } from "../../src/actions"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { FunKit } from "../../src/FunKit"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface BridgeTestConfig {
    fromChainId: number
    toChainId: number
    fromToken: string
    toToken: string
    amountToBridge: number
    baseToken: string
    walletCreationCost: number
    index?: number
    numRetry?: number
}

export const BridgeTest = (config: BridgeTestConfig) => {
    describe("Bridge Test - Bridge 1 token between two chains using socket", async function () {
        this.timeout(400_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain

        let fun: FunKit
        let baseTokenObj: Token
        let fromTokenObj: Token

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.fromChainId,
                apiKey: apiKey,
                gasSponsor: undefined
            }

            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 1992811349)

            chain = wallet.getChain()

            baseTokenObj = wallet.getToken(config.baseToken)
            if (Number(await baseTokenObj.getBalance()) < config.walletCreationCost) {
                await fundWallet(auth, wallet, config.walletCreationCost)
            }

            fromTokenObj = wallet.getToken(config.fromToken)
            if (Number(fromTokenObj.getBalance()) < config.amountToBridge) {
                const tokenAction = await fun.getTokenAction()
                await auth.sendTx(
                    await tokenAction.tokenTransferTransactionParams({
                        to: await wallet.getAddress(),
                        amount: config.amountToBridge,
                        token: config.fromToken
                    }),
                    chain
                )
            }
        })

        after(async function () {
            await wallet.transfer(auth, await auth.getAddress(), {
                to: await auth.getAddress(),
                amount: (Number(await baseTokenObj.getBalance()) * 4) / 5,
                token: "eth"
            })
        })

        it("bridge usdc source to destination chain", async () => {
            const userOp = await wallet.bridge(auth, await auth.getAddress(), {
                fromChain: config.fromChainId,
                toChain: config.toChainId,
                fromToken: config.fromToken,
                toToken: config.toToken,
                amount: config.amountToBridge,
                sort: SocketSort.gas
            })
            const bridgeExecutionReceipt = await wallet.executeOperation(auth, userOp)
            expect(bridgeExecutionReceipt).to.not.throw
        })

        it("failure - invalid token address", async () => {
            try {
                await wallet.bridge(auth, await auth.getAddress(), {
                    fromChain: config.fromChainId,
                    toChain: config.toChainId,
                    fromToken: config.fromToken,
                    toToken: "0x0000000000000000000000000000000000000000",
                    amount: config.amountToBridge,
                    sort: SocketSort.gas
                })
            } catch (e: any) {
                expect(e.message).to.include("Unable to find a route for these assets between these chains")
            }
        })

        it("failure - not enough tokens", async () => {
            try {
                await wallet.bridge(auth, await auth.getAddress(), {
                    fromChain: config.fromChainId,
                    toChain: config.toChainId,
                    fromToken: config.fromToken,
                    toToken: config.toToken,
                    amount: 100000000000000000000,
                    sort: SocketSort.gas
                })
            } catch (e: any) {
                expect(e.message).to.include("server failure")
            }
        })
    })
}
