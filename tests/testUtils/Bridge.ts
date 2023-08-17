import { expect } from "chai"
import { erc20TransferTransactionParams } from "../../src/actions"
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
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811340)
            })
            if (Number(await Token.getBalance(config.baseToken, await wallet.getAddress())) < config.walletCreationCost) {
                await fundWallet(auth, wallet, config.walletCreationCost)
            }
            console.log("Auth", await auth.getAddress())
            await auth.sendTx(
                await erc20TransferTransactionParams({
                    to: await wallet.getAddress(),
                    amount: 1,
                    token: config.fromToken
                })
            )
        })

        it(`bridge usdc from ${(await Chain.getChain({ chainIdentifier: config.fromChainId })).getChainName()} to ${(
            await Chain.getChain({ chainIdentifier: config.toChainId })
        ).getChainName()}`, async () => {
            const userOp = await wallet.bridge(auth, await auth.getAddress(), {
                fromChain: await Chain.getChain({ chainIdentifier: config.fromChainId }),
                toChain: await Chain.getChain({ chainIdentifier: config.toChainId }),
                fromToken: config.fromToken,
                toToken: config.toToken,
                amount: config.amountToBridge,
                sort: "gas"
            })
            const bridgeExecutionReceipt = await wallet.executeOperation(auth, userOp)
            console.log(bridgeExecutionReceipt)
            expect(bridgeExecutionReceipt).to.not.throw
        })
    })
}
