import { expect } from "chai"
import { getOps } from "../../src/apis/OperationApis"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface AutomatedActionsConfig {
    chainId: number
    outToken: string
    baseToken: string
    prefund: boolean
    index?: number
    amount?: number
    prefundAmt?: number
    numRetry?: number
}

export const AutomatedActionsTest = (config: AutomatedActionsConfig) => {
    const { outToken, prefund, prefundAmt } = config

    describe("Automated Actions Test - Store in DB and execute later", function () {
        this.timeout(300_000)
        let auth: Auth
        let wallet: FunWallet

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
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 1792811340)
            })
            if (prefund) await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 1)
        })

        it("transfer baseToken(ETH)", async () => {
            const randomAddress = randomBytes(20)

            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
            })
            const opId = await wallet.scheduleOperation(auth, userOp)
            const operation = await getOps([opId], config.chainId.toString())
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })

        it("transfer ERC20 tokens", async () => {
            const randomAddress = randomBytes(20)

            const outTokenAddress = await Token.getAddress(outToken)
            if (config.chainId === 5) {
                const chain = await getChainFromData(config.chainId)
                const outTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(outTokenAddress, "mint", [
                    await wallet.getAddress(),
                    1000000000000000000000n
                ])
                await chain.init()
                await auth.sendTx({ ...outTokenMint })
            }

            const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: randomAddress, amount: 1, token: outTokenAddress })
            const opId = await wallet.scheduleOperation(auth, userOp)
            const operation = await getOps([opId], config.chainId.toString())
            expect(operation[0].opId).to.equal(opId)
            expect(operation[0].userOp.sender).to.equal(await wallet.getAddress())
        })
    })
}
