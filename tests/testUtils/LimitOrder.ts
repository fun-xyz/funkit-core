import { assert, expect } from "chai"
import { parseEther } from "viem"
import { getOps } from "../../src/apis/OperationApis"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface LimitOrderConfig {
    chainId: number
    outToken: string
    baseToken: string
    index?: number
    amount?: number
    prefundAmt: number
    numRetry?: number
    tokenInAmount: number
    tokenOutAmount: number
}

export const LimitOrderTest = (config: LimitOrderConfig) => {
    const { prefundAmt } = config

    describe("Limit Order Test - Store Limit Order and Execute later", async function () {
        this.timeout(500_000)
        let auth: Auth
        let wallet: FunWallet
        let opId

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
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
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811340)
            })

            const chain = await Chain.getChain({ chainIdentifier: config.chainId.toString() })
            const client = await chain.getClient()
            const balance = await client.getBalance({ address: await wallet.getAddress() })
            if (balance < parseEther(`${prefundAmt}`)) {
                await fundWallet(auth, wallet, prefundAmt)
            }
        })

        it("swap baseToken(ETH) schedule", async () => {
            const userOp = await wallet.limitSwapOrder(auth, await auth.getAddress(), {
                tokenIn: config.baseToken,
                tokenOut: config.outToken,
                tokenInAmount: config.tokenInAmount,
                tokenOutAmount: config.tokenOutAmount
            })

            opId = await wallet.scheduleOperation(auth, userOp)
            console.log("limitOrder opId: ", opId)
            const operation = await getOps([opId], config.chainId.toString())
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })

        it("swap baseToken(ETH) executed", async () => {
            const balBefore = await Token.getBalanceBN(config.outToken, await wallet.getAddress())
            await new Promise((resolve) => {
                setTimeout(resolve, 400_000)
            })
            const balAfter = await Token.getBalanceBN(config.outToken, await wallet.getAddress())
            assert(balAfter > balBefore, `Swap did not execute: Out token balance should be greater than before ${balBefore}, ${balAfter}`)
        })
    })
}
