import { assert } from "chai"
import { Hex } from "viem"
import { SessionKeyParams, createSessionUser } from "../../src/actions"
import { Auth } from "../../src/auth"
import { APPROVE_AND_SWAP_ABI, ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { fundWallet, generateRandomGroupId } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface SwapTestConfig {
    chainId: number
    inToken: string
    outToken: string
    baseToken: string
    prefund: boolean
    amount?: number
    index?: number
    prefundAmt?: number
    mint?: boolean
    slippage?: number
    numRetry?: number
}

export const SwapTest = (config: SwapTestConfig) => {
    const { inToken, outToken, baseToken, prefund, amount, prefundAmt } = config
    const mint = Object.values(config).includes("mint") ? true : config.mint
    describe("Single Auth Swap", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 1792811340)
            })

            if (prefund) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (mint) {
                const chain = await getChainFromData(options.chain)
                await chain.init()
                const inTokenAddress = await Token.getAddress(inToken, options)
                const decAmount = await Token.getDecimalAmount(inTokenAddress, amount ? amount : 19000000, options)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionData(inTokenAddress, "mint", [await wallet.getAddress(), decAmount])
                data.chain = chain
                await auth.sendTx(data)
                const wethAddr = await Token.getAddress("weth", options)
                const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: wethAddr, amount: 0.002 })
                await wallet.executeOperation(auth, userOp)
            }
        })

        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                in: baseToken,
                amount: config.amount ? config.amount : 0.001,
                out: inToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            await wallet.executeOperation(auth, operation)

            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                in: inToken,
                amount: 1, //Number((erc20Delta / 2).toFixed(3)),
                out: outToken,
                slippage: config.slippage ? config.slippage : 0.5,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            await wallet.executeOperation(auth, operation)
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
        })

        it("ERC20 => ETH", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            const userOp = await wallet.swap(auth, await auth.getAddress(), {
                in: inToken,
                amount: 1,
                out: baseToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            await wallet.executeOperation(auth, userOp)
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
        })

        describe("With Session Key", () => {
            const user = createSessionUser()
            before(async () => {
                const second = 1000
                const minute = 60 * second
                const chain = await getChainFromData(config.chainId)
                const deadline = BigInt(Date.now() + 2 * minute) / 1000n
                const targetAddr = await chain.getAddress("tokenSwapAddress")
                const sessionKeyParams: SessionKeyParams = {
                    user,
                    targetWhitelist: [targetAddr],
                    actionWhitelist: [
                        {
                            abi: APPROVE_AND_SWAP_ABI,
                            functionWhitelist: ["executeSwapETH", "executeSwapERC20"]
                        }
                    ],
                    deadline,
                    chainId: config.chainId
                }

                const operation = await wallet.createSessionKey(auth, await auth.getAddress(), sessionKeyParams)
                await wallet.executeOperation(auth, operation)
            })

            it("ETH => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)

                const operation = await wallet.swap(user, await user.getAddress(), {
                    in: baseToken,
                    amount: config.amount ? config.amount : 0.001,
                    out: inToken,
                    returnAddress: walletAddress,
                    chainId: config.chainId
                })

                await wallet.executeOperation(user, operation)

                const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            })

            it("ERC20 => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)

                const operation = await wallet.swap(user, await user.getAddress(), {
                    in: inToken,
                    amount: 1,
                    out: outToken,
                    slippage: config.slippage ? config.slippage : 0.5,
                    returnAddress: walletAddress,
                    chainId: config.chainId
                })

                await wallet.executeOperation(user, operation)
                const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
                assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
            })
        })
    })

    describe("Multi Sig Swap", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(200_000)
        let auth1: Auth
        let auth2: Auth
        let wallet: FunWallet
        const groupId: Hex = generateRandomGroupId()
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth1 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            auth2 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })

            // auth1 creates the wallet with a group of auth1 and auth2. The group is the owner of the wallet
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
                uniqueId: await auth1.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 8888)
            })

            if (prefund) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (mint) {
                const chain = await getChainFromData(options.chain)
                await chain.init()
                const inTokenAddress = await Token.getAddress(inToken, options)
                const decAmount = await Token.getDecimalAmount(inTokenAddress, amount ? amount : 19000000, options)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionData(inTokenAddress, "mint", [await wallet.getAddress(), decAmount])
                data.chain = chain
                await auth1.sendTx(data)
                const wethAddr = await Token.getAddress("weth", options)
                const userOp = await wallet.transfer(auth1, groupId, { to: wethAddr, amount: 0.002 })
                await wallet.executeOperation(auth1, userOp)
            }
        })

        it.only("Group Wallet Create, Collect Sig, and Execute -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                in: baseToken,
                amount: config.amount ? config.amount : 0.001,
                out: inToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(swapOp.opId!)

            // auth2 sign and execute the operation
            await wallet.executeOperation(auth2, operation)

            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        // it("Group Wallet Create, Execute Without Required Sigs -- ERC20 => ERC20", async () => {})

        // it("Group Wallet Reject Op -- ERC20 => ERC20", async () => {})

        // it("Group Wallet Create, Remove Op -- ERC20 => ETH", async () => {})
    })
}
