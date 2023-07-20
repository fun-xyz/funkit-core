import { assert } from "chai"
import { Hex } from "viem"
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

    describe("MultiSig Auth BatchActions", function () {
        this.timeout(300_000)
        this.timeout(300_000)
        let auth1: Auth
        let auth2: Auth
        let wallet: FunWallet
        const groupId: Hex = "0xb00c7b880a57369e49a454dad27494253cf6efa5c63381c6f0e567d86d5d5cbc" // generateRandomGroupId()
        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            auth1 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            auth2 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })
            wallet = new FunWallet({
                users: [
                    {
                        userId: groupId,
                        groupInfo: {
                            memberIds: [await auth1.getAddress(), await auth2.getAddress(), "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"],
                            threshold: 2
                        }
                    }
                ],
                uniqueId: await auth1.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 6666)
            })

            if (prefund) await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 1)
        })

        it.only("Approve tokens", async () => {
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
            const operation1 = await wallet.createBatchOperation(auth1, await groupId, txParams)

            await new Promise((r) => setTimeout(r, 2000))
            const operation = await wallet.getOperation(operation1.opId!)

            await wallet.executeOperation(auth2, operation)
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
    })
}
