import { assert } from "chai"
import { randInt } from "./utils"
import { erc20ApproveTransactionParams, uniswapV3SwapTransactionParams } from "../../src/actions"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface BatchActionsTestConfig {
    chainId: number
    outToken: string
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
            const outTokenAddress = await Token.getAddress(outToken)
            const txParams = randomAddresses.map((randomAddress) =>
                erc20ApproveTransactionParams({
                    spender: randomAddress,
                    amount: approveAmount,
                    token: outTokenAddress
                })
            )
            const operation = await wallet.createBatchOperation(auth, await auth.getAddress(), txParams)
            await wallet.executeOperation(auth, operation)
            for (const randomAddr of randomAddresses) {
                const approvedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(
                    outTokenAddress,
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
            const outTokenAddress = await Token.getAddress(outToken)

            const txParams = randomAddresses.map((randomAddress) =>
                erc20ApproveTransactionParams({
                    spender: randomAddress,
                    amount: approveAmount,
                    token: outTokenAddress
                })
            )
            try {
                const operation = await wallet.createBatchOperation(randAuth, await randAuth.getAddress(), txParams)
                await wallet.executeOperation(randAuth, operation)
                assert(false, "transaction passed")
            } catch (e: any) {
                assert(true)
            }
        })

        it("Swap, Approve", async () => {
            const randomAddress = randomBytes(20)
            const approveAmount = randInt(10000)
            const swapParams = await uniswapV3SwapTransactionParams({
                in: "eth",
                out: outToken,
                amount: 0.001,
                returnAddress: randomAddress,
                chainId: config.chainId
            })
            const outTokenAddress = await Token.getAddress(outToken)
            const approveParams = erc20ApproveTransactionParams({
                spender: randomAddress,
                amount: approveAmount,
                token: outTokenAddress
            })
            const walletAddress = await wallet.getAddress()
            const chain = await getChainFromData(config.chainId)
            const operation = await wallet.createBatchOperation(auth, await auth.getAddress(), [swapParams, approveParams])
            await wallet.executeOperation(auth, operation)
            const approvedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(
                outTokenAddress,
                "allowance",
                [walletAddress, randomAddress],
                chain
            )
            assert(BigInt(approvedAmount) === BigInt(approveAmount), "BatchActions failed")
            const swappedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(outTokenAddress, "balanceOf", [randomAddress], chain)
            assert(BigInt(swappedAmount) > 0, "Swap unsuccesful")
        })
    })
}
