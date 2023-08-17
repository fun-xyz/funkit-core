import { assert, expect } from "chai"
import { getOps } from "../../src/apis/OperationApis"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface AutomatedActionsConfig {
    chainId: number
    outToken: string
    baseToken: string
    index?: number
    amount?: number
    prefundAmt?: number
    numRetry?: number
}

export const AutomatedActionsTest = (config: AutomatedActionsConfig) => {
    const { prefundAmt, baseToken } = config

    describe("Automated Actions Test - Store in DB and execute later", function () {
        this.timeout(300_000)
        let auth: Auth
        let wallet: FunWallet
        let opId

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811340)
            })

            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < 0.01) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }
        })

        const randomAddress = randomBytes(20)
        const amount = config.amount ? config.amount : 0.001
        it("transfer baseToken(ETH) schedule", async () => {
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: randomAddress,
                amount,
                token: "eth"
            })
            opId = await wallet.scheduleOperation(auth, userOp)
            const operation = await getOps([opId], config.chainId.toString())
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })

        it("transfer baseToken(ETH) executed", async () => {
            this.timeout(600_000)
            let operation = await getOps([opId], config.chainId.toString())
            while (operation[0].status === "SCHEDULED" || operation[0].status === "PENDING") {
                await new Promise((resolve) => {
                    setTimeout(resolve, 10_000)
                })
                operation = await getOps([opId], config.chainId.toString())
            }
            assert(operation[0].status === "OP_SUCCEED")
            const bal = await Token.getBalanceBN("eth", randomAddress)
            assert(bal !== 0n, "Balance not equal to amount")
        })
    })
}
