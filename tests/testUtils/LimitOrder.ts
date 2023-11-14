import { assert, expect } from "chai"
import { parseEther } from "viem"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { Chain } from "../../src/data"
import { FunKit } from "../../src/FunKit"
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
        let chain: Chain

        let fun: FunKit

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 1792811340)

            chain = wallet.chain
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
            const operation = await fun.getOps([opId])
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })

        it("swap baseToken(ETH) executed", async () => {
            const outTokenObj = wallet.getToken(config.outToken)
            const balBefore = await outTokenObj.getBalanceBN()
            await new Promise((resolve) => {
                setTimeout(resolve, 400_000)
            })
            const balAfter = await outTokenObj.getBalanceBN()
            assert(balAfter > balBefore, `Swap did not execute: Out token balance should be greater than before ${balBefore}, ${balAfter}`)
        })
    })
}
