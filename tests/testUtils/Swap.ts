import { assert, expect } from "chai"
import { Hex } from "viem"
import { SessionKeyParams } from "../../src/actions"
import { Auth, SessionKeyAuth } from "../../src/auth"
import { APPROVE_AND_SWAP_ABI, ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { InternalFailureError, InvalidParameterError } from "../../src/errors"
import { FunKit } from "../../src/FunKit"
import { fundWallet, generateRoleId, generateRuleId, isContract, randomBytes } from "../../src/utils"
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
    describe("Single Auth Swap", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(200_000)
        let auth: Auth
        let fun: FunKit
        let wallet: FunWallet
        let chain: Chain
        let inTokenObj: Token
        let baseTokenObj: Token
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 1792811940, config.chainId)
            inTokenObj = wallet.getToken(inToken)
            baseTokenObj = wallet.getToken(baseToken)

            chain = wallet.getChain()
            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await baseTokenObj.getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.01)
            }
            if (mint) {
                const inTokenAddress = await inTokenObj.getAddress()
                const decAmount = await inTokenObj.getDecimalAmount(amount ? amount : 19000000)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(inTokenAddress, "mint", [
                    await wallet.getAddress(),
                    decAmount
                ])
                await auth.sendTx({ ...data }, chain)
                const wethAddr = await wallet.getToken("weth").getAddress()
                const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: wethAddr, amount: 0.002, token: "eth" })
                await wallet.executeOperation(auth, userOp)
            }
        })

        it("ETH => ERC20", async () => {
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                tokenIn: baseToken,
                inAmount: config.amount ? config.amount : 0.001,
                tokenOut: inToken
            })
            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                tokenIn: inToken,
                inAmount: 0.000001,
                tokenOut: outToken,
                slippage: config.slippage ? config.slippage : 0.5
            })
            expect(await wallet.executeOperation(auth, operation)).to.not.throw
            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter < tokenBalanceBefore, `Swap did not execute, ${tokenBalanceAfter} ${tokenBalanceBefore}`)
        })

        it("ERC20 => ETH", async () => {
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()
            const operation = await wallet.swap(auth, await auth.getAddress(), {
                tokenIn: inToken,
                inAmount: 0.000001,
                tokenOut: baseToken
            })
            await wallet.executeOperation(auth, operation)
            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter < tokenBalanceBefore, `Swap did not execute ${tokenBalanceAfter} ${tokenBalanceBefore}`)
        })

        describe("With Session Key", () => {
            let user: SessionKeyAuth
            before(async () => {
                const second = 1000
                const minute = 60 * second
                const deadline = (Date.now() + 10 * minute) / 1000
                const targetAddr = wallet.chain.getAddress("tokenSwapAddress")
                const sessionKeyParams: SessionKeyParams = {
                    targetWhitelist: [targetAddr],
                    actionWhitelist: [
                        {
                            abi: APPROVE_AND_SWAP_ABI,
                            functionWhitelist: ["executeSwapETH", "executeSwapERC20"]
                        }
                    ],
                    deadline,
                    ruleId: generateRuleId(),
                    roleId: generateRoleId()
                }

                user = await (await fun.getAccessControlAction()).createSessionUser({ privateKey: randomBytes(32) }, sessionKeyParams)
                sessionKeyParams.userId = await user.getUserId()

                const operation = await wallet.createSessionKey(auth, await auth.getAddress(), sessionKeyParams)
                await wallet.executeOperation(auth, operation)
            })

            it("ETH => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await inTokenObj.getBalanceBN()

                const operation = await wallet.swap(user, await user.getAddress(), {
                    tokenIn: baseToken,
                    inAmount: config.amount ? config.amount : 0.001,
                    tokenOut: inToken,
                    recipient: walletAddress
                })

                await wallet.executeOperation(user, operation)
                if (config.chainId === 1) {
                    await new Promise((r) => setTimeout(r, 10000))
                }
                const tokenBalanceAfter = await inTokenObj.getBalanceBN()
                assert(tokenBalanceAfter > tokenBalanceBefore, `Swap did not execute ${tokenBalanceAfter}, ${tokenBalanceBefore}`)
            })

            it("ERC20 => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await inTokenObj.getBalanceBN()

                const operation = await wallet.swap(user, await user.getAddress(), {
                    tokenIn: inToken,
                    inAmount: 0.00001,
                    tokenOut: outToken,
                    slippage: config.slippage ? config.slippage : 0.5,
                    recipient: walletAddress
                })

                await wallet.executeOperation(user, operation)
                if (config.chainId === 1) {
                    await new Promise((r) => setTimeout(r, 15000))
                }
                const tokenBalanceAfter = await inTokenObj.getBalanceBN()
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
        let chain: Chain
        let fun: FunKit
        let inTokenObj: Token
        let baseTokenObj: Token

        const groupId: Hex = "0xbaec3e7f11004e16972a0392ad0d114b7c6378b7b47b6cddd802ba44c3f56bb8" // generateRandomGroupId()
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth1 = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            auth2 = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })
            // auth1 creates the wallet with a group of auth1 and auth2. The group is the owner of the wallet

            const users = [
                {
                    userId: groupId,
                    groupInfo: {
                        memberIds: [await auth1.getAddress(), await auth2.getAddress(), "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"],
                        threshold: 2
                    }
                }
            ]

            const uniqueId = await auth1.getWalletUniqueId(config.index ? config.index : 12909468)

            wallet = await fun.createWalletWithUsersAndId(users, uniqueId, config.chainId)
            inTokenObj = wallet.getToken(inToken)
            baseTokenObj = wallet.getToken(baseToken)

            chain = wallet.getChain()
            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await baseTokenObj.getBalance()) < 0.009) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.01)
            }

            if (mint) {
                const inTokenAddress = await inTokenObj.getAddress()
                const decAmount = await inTokenObj.getDecimalAmount(amount ? amount : 19000000)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(inTokenAddress, "mint", [
                    await wallet.getAddress(),
                    decAmount
                ])

                await auth1.sendTx({ ...data }, chain)
                const wethAddr = await wallet.getToken("weth").getAddress()
                const userOp = await wallet.transfer(auth1, groupId, { to: wethAddr, amount: 0.002, token: "eth" })
                await wallet.executeOperation(auth1, userOp)
            }
        })

        it("Group Wallet Create, Collect Sig, and Execute -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                inAmount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                recipient: walletAddress
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(swapOp.opId!)

            // auth2 sign the operation
            expect(await wallet.signOperation(auth2, operation)).to.not.throw

            // auth1 execute the operation
            expect(await wallet.executeOperation(auth1, operation)).to.not.throw

            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("Group Wallet Create, Execute Without Required Sigs -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                inAmount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                recipient: walletAddress
            })

            // auth1 executes it without auth2 signature
            try {
                await wallet.executeOperation(auth1, swapOp)
            } catch (err) {
                if (!(err instanceof InvalidParameterError)) {
                    throw err
                }
            }

            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter === tokenBalanceBefore, "Swap executed without required sigs")
        })

        it("Group Wallet Reject Op -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                inAmount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                recipient: walletAddress
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

            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter === tokenBalanceBefore, "Swap executed with bad nonce")
        })

        it("Group Wallet Create, Remove Op -- ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await inTokenObj.getBalanceBN()

            // auth1 creates and signs the swap operation, the operation should be stored into DDB
            const swapOp = await wallet.swap(auth1, groupId, {
                tokenIn: baseToken,
                inAmount: config.amount ? config.amount : 0.001,
                tokenOut: inToken,
                recipient: walletAddress
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth1 decides to remove the Op so other people can't see it
            expect(await wallet.removeOperation(auth1, swapOp.opId!)).to.not.throw

            // auth2 logs in and should not be able to find the operation.
            expect(await wallet.getOperation(swapOp.opId!)).to.throw

            const tokenBalanceAfter = await inTokenObj.getBalanceBN()
            assert(tokenBalanceAfter === tokenBalanceBefore, "Swap executed without enough signature")
        })
    })
}
