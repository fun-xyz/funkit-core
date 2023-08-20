import { assert, expect } from "chai"
import { Hex } from "viem"
import { SessionKeyParams, createSessionUser } from "../../src/actions"
import { Auth } from "../../src/auth"
import { APPROVE_AND_SWAP_ABI, ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { InternalFailureError, InvalidParameterError } from "../../src/errors"
import { fundWallet, isContract } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface SwapTestConfig {
    chainId: number
    inToken: string
    outToken: string
    baseToken: string
    amount?: number
    index?: number
    prefundAmt: number
    mint?: boolean
    slippage?: number
    numRetry?: number
    erc20toerc20Amt?: number
    erc20toethAmt?: number
}

export const SwapTest = (config: SwapTestConfig) => {
    const { inToken, outToken, baseToken, amount, prefundAmt } = config
    const mint = Object.values(config).includes("mint") ? true : config.mint
    describe.only("Single Auth Swap", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        before(async function () {
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
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811940)
            })

            const chain = await Chain.getChain({ chainIdentifier: config.chainId })
            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < 0.009) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.01)
            }
            if (mint) {
                const inTokenAddress = await Token.getAddress(inToken, options)
                const decAmount = await Token.getDecimalAmount(inTokenAddress, amount ? amount : 19000000, options)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(inTokenAddress, "mint", [
                    await wallet.getAddress(),
                    decAmount
                ])
                await auth.sendTx({ ...data })
                const wethAddr = await Token.getAddress("weth", options)
                const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: wethAddr, amount: 0.002, token: "eth" })
                await wallet.executeOperation(auth, userOp)
            }
        })

        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                tokenIn: baseToken,
                amount: config.amount ? config.amount : 0.001,
                tokenOut: inToken
            })
            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                tokenIn: inToken,
                amount: 0.0001,
                tokenOut: outToken,
                slippage: config.slippage ? config.slippage : 0.5
            })
            expect(await wallet.executeOperation(auth, operation)).to.not.throw
            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter < tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ETH", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                tokenIn: inToken,
                amount: 0.0001,
                tokenOut: baseToken
            })
            expect(await wallet.executeOperation(auth, operation)).to.not.throw
            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter < tokenBalanceBefore, "Swap did not execute")
        })

        describe("With Session Key", () => {
            const user = createSessionUser()
            before(async () => {
                const second = 1000
                const minute = 60 * second
                const chain = await Chain.getChain({ chainIdentifier: config.chainId })
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
                    deadline
                }

                const operation = await wallet.createSessionKey(auth, await auth.getAddress(), sessionKeyParams)
                await wallet.executeOperation(auth, operation)
            })

            it("ETH => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)

                const operation = await wallet.swap(user, await user.getAddress(), {
                    tokenIn: baseToken,
                    amount: config.amount ? config.amount : 0.001,
                    tokenOut: inToken,
                    returnAddress: walletAddress
                })

                await wallet.executeOperation(user, operation)

                const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            })

            it("ERC20 => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)

                const operation = await wallet.swap(user, await user.getAddress(), {
                    tokenIn: inToken,
                    amount: 1,
                    tokenOut: outToken,
                    slippage: config.slippage ? config.slippage : 0.5,
                    returnAddress: walletAddress
                })

                await wallet.executeOperation(user, operation)
                const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
                assert(tokenBalanceAfter < tokenBalanceBefore, "Swap did not execute")
            })
        })
    })

    describe("Multi Sig Swap", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(200_000)
        let auth1: Auth
        let auth2: Auth
        let wallet: FunWallet
        const groupId: Hex = "0xbaec3e7f11004e16972a0392ad0d114b7c6378b7b47b6cddd802ba44c3f56bb7" // generateRandomGroupId()
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
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
                uniqueId: await auth1.getWalletUniqueId(config.index ? config.index : 12909468)
            })

            const chain = await Chain.getChain({ chainIdentifier: config.chainId })
            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < 0.009) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.01)
            }

            if (mint) {
                const inTokenAddress = await Token.getAddress(inToken, options)
                const decAmount = await Token.getDecimalAmount(inTokenAddress, amount ? amount : 19000000, options)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(inTokenAddress, "mint", [
                    await wallet.getAddress(),
                    decAmount
                ])

                await auth1.sendTx({ ...data })
                const wethAddr = await Token.getAddress("weth", options)
                const userOp = await wallet.transfer(auth1, groupId, { to: wethAddr, amount: 0.002, token: "eth" })
                await wallet.executeOperation(auth1, userOp)
            }
        })

        it("Group Wallet Create, Collect Sig, and Execute -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                amount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                returnAddress: walletAddress
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(swapOp.opId!)

            // auth2 sign and execute the operation
            expect(await wallet.executeOperation(auth2, operation)).to.not.throw

            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("Group Wallet Create, Execute Without Required Sigs -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                amount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                returnAddress: walletAddress
            })

            // auth1 executes it without auth2 signature
            try {
                await wallet.executeOperation(auth1, swapOp)
            } catch (err) {
                if (!(err instanceof InvalidParameterError)) {
                    throw err
                }
            }

            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter === tokenBalanceBefore, "Swap executed without required sigs")
        })

        it("Group Wallet Reject Op -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                amount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                returnAddress: walletAddress
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(swapOp.opId!)

            // auth2 rejects the operation
            const rejectionOp = await wallet.createRejectOperation(auth2, groupId, operation, "Op should be rejected")

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth1 logs in and finds out the rejection operation
            const rejection = await wallet.getOperation(rejectionOp.opId!)

            expect(await wallet.executeOperation(auth1, rejection)).to.not.throw

            // now we try to use auth2 to sign the original op and execute it
            try {
                await wallet.executeOperation(auth2, operation)
            } catch (err: any) {
                if (!(err instanceof InternalFailureError) && err.errorCode === "UserOpFailureError") {
                    throw err
                }
            }

            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter === tokenBalanceBefore, "Swap executed with bad nonce")
        })

        it("Group Wallet Create, Remove Op -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(inToken, walletAddress)

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                amount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                returnAddress: walletAddress
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth1 decides to remove the Op so other people can't see it
            expect(await wallet.removeOperation(auth1, swapOp.opId!)).to.not.throw

            // auth2 logs in and should not be able to find the operation.
            expect(await wallet.getOperation(swapOp.opId!)).to.throw

            const tokenBalanceAfter = await Token.getBalanceBN(inToken, walletAddress)
            assert(tokenBalanceAfter === tokenBalanceBefore, "Swap executed without enough signature")
        })
    })
}
