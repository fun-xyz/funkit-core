import { assert, expect } from "chai"
import { getOps } from "../../src/apis/OperationApis"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
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
        this.timeout(400_000)
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
            console.log("Reached")
            await configureEnvironment(options)
            console.log("Reached")
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            console.log("Reached")
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811340)
            })
            console.log("Reached")
            if (Number(await Token.getBalance(config.baseToken, await wallet.getAddress())) < prefundAmt) {
                console.log("Reached")
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 1)
                console.log("Reached")
            }
            console.log("Reached1")
        })

        it("swap baseToken(ETH) schedule", async () => {
            console.log("Reached2")
            if (Number(await Token.getBalance(config.baseToken, await wallet.getAddress())) < config.tokenInAmount) {
                await auth.sendTx(await Token.transfer(config.baseToken, await wallet.getAddress(), 100))
            }
            console.log("Reached")
            const userOp = await wallet.limitSwapOrder(auth, await auth.getAddress(), {
                tokenIn: config.baseToken,
                tokenOut: config.outToken,
                tokenInAmount: config.tokenInAmount,
                tokenOutAmount: config.tokenOutAmount
            })
            console.log("Reached")
            opId = await wallet.scheduleOperation(auth, userOp)
            const operation = await getOps([opId], config.chainId.toString())
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })

        it.only("transfer baseToken(ETH) executed", async () => {
            const balBefore = await Token.getBalanceBN(config.outToken, await wallet.getAddress())
            await new Promise((resolve) => {
                setTimeout(resolve, 300_000)
            })
            const balAfter = await Token.getBalanceBN(config.outToken, await wallet.getAddress())
            assert(balAfter > balBefore, "Swap did not execute: Out token balance should be greater than before")
        })
    })
}
