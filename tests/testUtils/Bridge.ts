import { expect } from "chai"
import { SocketSort, tokenTransferTransactionParams } from "../../src/actions"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
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

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.fromChainId,
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1992811349)
            })

            chain = await Chain.getChain({ chainIdentifier: config.fromChainId })
            if (Number(await Token.getBalance(config.baseToken, await wallet.getAddress(), chain)) < config.walletCreationCost) {
                await fundWallet(auth, wallet, config.walletCreationCost)
            }
            if (Number(await new Token(config.fromToken, chain).getBalance(await wallet.getAddress())) < config.amountToBridge) {
                await auth.sendTx(
                    await tokenTransferTransactionParams(
                        {
                            to: await wallet.getAddress(),
                            amount: config.amountToBridge,
                            token: config.fromToken
                        },
                        chain
                    )
                )
            }
        })

        after(async function () {
            await wallet.transfer(auth, await auth.getAddress(), {
                to: await auth.getAddress(),
                amount: (Number(await Token.getBalance(config.baseToken, await wallet.getAddress(), chain)) * 4) / 5,
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
