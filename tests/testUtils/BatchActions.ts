import { assert } from "chai"
import { Address } from "viem"
import { randInt } from "./utils"
import { erc20ApproveTransactionParams } from "../../src/actions"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { getChainFromData } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface BatchActionsTestConfig {
    chainId: number
    outToken: Address
    baseToken: string
    prefund: boolean
    index?: number
    amount?: number
    prefundAmt?: number
    numRetry?: number
}

export const BatchActionsTest = (config: BatchActionsTestConfig) => {
    const { outToken, prefund, prefundAmt } = config

    describe("Single Auth BatchActions", function () {
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

        it("Approve tokens", async () => {
            const chain = await getChainFromData(config.chainId)
            const randomAddresses = new Array(5).fill(randomBytes(20))
            const walletAddress = await wallet.getAddress()
            const approveAmount = randInt(10000)
            const txParams = randomAddresses.map((randomAddress) =>
                erc20ApproveTransactionParams({
                    spender: randomAddress,
                    amount: approveAmount,
                    token: outToken as Address
                })
            )
            const operation = await wallet.executeBatch(auth, await auth.getAddress(), txParams)
            await wallet.executeOperation(auth, operation)
            for (const randomAddr of randomAddresses) {
                const approvedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(
                    outToken,
                    "allowance",
                    [walletAddress, randomAddr],
                    chain
                )

                assert(BigInt(approvedAmount) === BigInt(approveAmount), "BatchActions failed")
            }
        })

        it("Incorrect Auth", async () => {
            const randAuth = new Auth({ privateKey: randomBytes(32) })
            const randomAddresses = new Array(5).fill(randomBytes(20))
            const approveAmount = randInt(10000)
            const txParams = randomAddresses.map((randomAddress) =>
                erc20ApproveTransactionParams({
                    spender: randomAddress,
                    amount: approveAmount,
                    token: outToken as Address
                })
            )
            try {
                const operation = await wallet.executeBatch(randAuth, await randAuth.getAddress(), txParams)
                await wallet.executeOperation(randAuth, operation)
                assert(false, "transaction passed")
            } catch (e: any) {
                assert(true)
            }
        })
    })
}
