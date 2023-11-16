import { assert, expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { FunKit } from "../../src/FunKit"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface AutomatedActionsConfig {
    chainId: number
    baseToken: string
    index?: number
    amount?: number
    prefundAmt: number
    numRetry?: number
}

export const AutomatedActionsTest = (config: AutomatedActionsConfig) => {
    const { prefundAmt, baseToken } = config

    describe("Automated Actions Test - Store in DB and execute later", async function () {
        this.timeout(400_000)
        let auth: Auth
        let wallet: FunWallet
        let opId
        let chain: Chain
        let fun: FunKit
        let baseTokenObj: Token

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

            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 1792811340, config.chainId)

            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }

            chain = wallet.getChain()

            baseTokenObj = wallet.getToken(baseToken)

            if (Number(await baseTokenObj.getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }
        })

        it("transfer baseToken(ETH) schedule", async () => {
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: await auth.getAddress(),
                amount: 0.0001,
                token: "eth"
            })
            opId = await wallet.scheduleOperation(auth, userOp)
            const operation = await fun.getOps([opId], config.chainId.toString())
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })

        it("transfer baseToken(ETH) executed", async () => {
            const balBefore = await fun.getTokenBalance("eth", await auth.getAddress(), chain)
            await new Promise((resolve) => {
                setTimeout(resolve, 300_000)
            })
            const balAfter = await fun.getTokenBalance("eth", await auth.getAddress(), chain)
            assert(balAfter > balBefore, `Balance not equal to amount ${balAfter} ${balBefore}`)
        })
    })
}
