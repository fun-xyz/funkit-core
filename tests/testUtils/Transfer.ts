import { assert, expect } from "chai"
import { Hex } from "viem"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { InternalFailureError, InvalidParameterError } from "../../src/errors"
import { FunKit } from "../../src/FunKit"
import { fundWallet, isContract, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface TransferTestConfig {
    chainId: number
    outToken: string
    baseToken: string
    index?: number
    amount?: number
    prefundAmt: number
    numRetry?: number
    outTokenPrefund?: number
}

export const TransferTest = (config: TransferTestConfig) => {
    const { outToken, baseToken, prefundAmt, amount, outTokenPrefund } = config

    describe("Single Auth Transfer", function () {
        this.timeout(300_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        let apiKey: string
        let baseTokenObj: Token
        let outTokenObj: Token

        let fun: FunKit

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 1992811349, config.chainId)
            baseTokenObj = wallet.getToken(baseToken)
            outTokenObj = wallet.getToken(outToken)

            chain = wallet.getChain()
            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }

            if (Number(await baseTokenObj.getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }
            const outTokenPrefundAmount = outTokenPrefund ? outTokenPrefund : 0.01
            if (Number(await outTokenObj.getBalance()) < outTokenPrefundAmount) {
                const txData = await outTokenObj.transfer(await wallet.getAddress(), outTokenPrefundAmount)
                await auth.sendTx(txData, chain)
            }
        })

        it("transfer baseToken directly", async () => {
            const randomAddress = await auth.getAddress()

            // Get token balance without having a fun wallet
            const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b2 = await baseTokenObj.getBalance()

            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: randomAddress,
                amount: amount ? amount : 0.00001,
                token: "eth"
            })
            expect(await wallet.executeOperation(auth, userOp)).to.not.throw
            const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b4 = await baseTokenObj.getBalance()

            await new Promise((r) => setTimeout(r, 2000))
            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(
                randomTokenBalanceAfter > randomTokenBalanceBefore,
                `Transfer failed, ${randomTokenBalanceAfter}, ${randomTokenBalanceBefore}`
            )
            assert(
                walletTokenBalanceBefore > walletTokenBalanceAfter,
                `Transfer failed, ${walletTokenBalanceBefore}, ${walletTokenBalanceAfter}`
            )
        })

        it("wallet should have lower balance of specified token", async () => {
            const outTokenObj = wallet.getToken(outToken)
            const outTokenAddress = await outTokenObj.getAddress()
            if (config.chainId === 5) {
                const outTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(outTokenAddress, "mint", [
                    await wallet.getAddress(),
                    await outTokenObj.getDecimalAmount(100)
                ])
                await auth.sendTx({ ...outTokenMint }, chain)
            }

            const b1 = await fun.getTokenBalance(outToken, await auth.getAddress(), chain)
            const b2 = await outTokenObj.getBalance()
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: await auth.getAddress(),
                amount: outTokenPrefund ? outTokenPrefund / 2 : 0.00001,
                token: outTokenAddress
            })
            expect(await wallet.executeOperation(auth, userOp)).to.not.throw
            const b3 = await fun.getTokenBalance(outToken, await auth.getAddress(), chain)
            const b4 = await outTokenObj.getBalance()

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(
                randomTokenBalanceAfter > randomTokenBalanceBefore,
                `Transfer failed, ${randomTokenBalanceAfter} ${randomTokenBalanceBefore}`
            )
            assert(
                walletTokenBalanceBefore > walletTokenBalanceAfter,
                `Transfer failed, ${walletTokenBalanceBefore} ${walletTokenBalanceAfter}`
            )
        })

        describe("Transaction Fees enabled", function () {
            it("pay a fixed amount of fees in eth", async function () {
                const randomAddress = randomBytes(20)
                const feeRecipientAddress = randomBytes(20)

                const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
                const b2 = await baseTokenObj.getBalance()
                const b5 = await fun.getTokenBalance(baseToken, feeRecipientAddress, chain)

                const fee = outTokenPrefund ? outTokenPrefund / 10 : 0.00001
                const options: GlobalEnvOption = {
                    apiKey: apiKey,
                    chain: config.chainId,
                    fee: {
                        token: baseToken,
                        amount: fee,
                        recipient: feeRecipientAddress
                    }
                }

                const userOp = await wallet.transfer(
                    auth,
                    await auth.getAddress(),
                    {
                        to: randomAddress,
                        amount: amount ? amount : 0.00001,
                        token: "eth"
                    },
                    options
                )

                expect(await wallet.executeOperation(auth, userOp)).to.not.throw

                const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
                const b4 = await baseTokenObj.getBalance()
                const b6 = await fun.getTokenBalance(baseToken, feeRecipientAddress, chain)

                const [
                    randomTokenBalanceBefore,
                    walletTokenBalanceBefore,
                    randomTokenBalanceAfter,
                    walletTokenBalanceAfter,
                    feeRecipientBalanceBefore,
                    feeRecipientBalanceAfter
                ] = await Promise.all([b1, b2, b3, b4, b5, b6])
                assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
                assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
                assert.closeTo(Number(feeRecipientBalanceAfter) - Number(feeRecipientBalanceBefore), fee, fee / 9, "Transfer failed")
            })

            it("pay a fixed amount of fees in tokens", async function () {
                const randomAddress = randomBytes(20)
                const feeRecipientAddress = randomBytes(20)

                const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
                const b2 = await baseTokenObj.getBalance()
                const b5 = await fun.getTokenBalance(outToken, feeRecipientAddress, chain)

                const fee = outTokenPrefund ? outTokenPrefund / 2 : 0.00001
                const options: GlobalEnvOption = {
                    apiKey: apiKey,
                    chain: config.chainId,
                    fee: {
                        token: outToken,
                        amount: fee,
                        recipient: feeRecipientAddress
                    }
                }

                const userOp = await wallet.transfer(
                    auth,
                    await auth.getAddress(),
                    {
                        to: randomAddress,
                        amount: amount ? amount : 0.00001,
                        token: "eth"
                    },
                    options
                )
                expect(await wallet.executeOperation(auth, userOp)).to.not.throw

                const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
                const b4 = await baseTokenObj.getBalance()
                const b6 = await fun.getTokenBalance(outToken, feeRecipientAddress, chain)

                const [
                    randomTokenBalanceBefore,
                    walletTokenBalanceBefore,
                    randomTokenBalanceAfter,
                    walletTokenBalanceAfter,
                    feeRecipientBalanceBefore,
                    feeRecipientBalanceAfter
                ] = await Promise.all([b1, b2, b3, b4, b5, b6])

                assert(
                    randomTokenBalanceAfter > randomTokenBalanceBefore,
                    `Transfer failed, ${randomTokenBalanceBefore}, ${randomTokenBalanceAfter}`
                )
                assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
                assert.closeTo(Number(feeRecipientBalanceAfter) - Number(feeRecipientBalanceBefore), fee, fee / 9, "Transfer failed")
            })

            it("pay a percentage of gas for fees", async () => {
                const randomAddress = randomBytes(20)

                const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
                const b2 = await baseTokenObj.getBalance()
                const b5 = await fun.getTokenBalance(baseToken, await auth.getAddress(), chain)

                const options: GlobalEnvOption = {
                    apiKey: apiKey,
                    chain: config.chainId,
                    fee: {
                        token: baseToken,
                        gasPercent: 1,
                        recipient: await auth.getAddress()
                    }
                }

                const userOp = await wallet.transfer(
                    auth,
                    await auth.getAddress(),
                    {
                        to: randomAddress,
                        amount: amount ? amount : 0.00001,
                        token: "eth"
                    },
                    options
                )
                expect(await wallet.executeOperation(auth, userOp)).to.not.throw

                const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
                const b4 = await baseTokenObj.getBalance()
                const b6 = await fun.getTokenBalance(baseToken, await auth.getAddress(), chain)

                const [
                    randomTokenBalanceBefore,
                    walletTokenBalanceBefore,
                    randomTokenBalanceAfter,
                    walletTokenBalanceAfter,
                    feeRecipientBalanceBefore,
                    feeRecipientBalanceAfter
                ] = await Promise.all([b1, b2, b3, b4, b5, b6])

                assert(
                    randomTokenBalanceAfter > randomTokenBalanceBefore,
                    `Transfer failed, ${randomTokenBalanceAfter} ${randomTokenBalanceBefore}`
                )
                assert(
                    walletTokenBalanceBefore > walletTokenBalanceAfter,
                    `Transfer failed, ${walletTokenBalanceBefore} ${walletTokenBalanceAfter}`
                )
                assert(
                    feeRecipientBalanceAfter > feeRecipientBalanceBefore,
                    `Transfer failed, ${feeRecipientBalanceAfter} ${feeRecipientBalanceBefore}`
                )
            })

            it("negative test - fee token and gas token not set", async () => {
                const fee = 0.001
                const options: GlobalEnvOption = {
                    apiKey: apiKey,
                    chain: config.chainId,
                    fee: {
                        amount: fee,
                        recipient: await auth.getAddress()
                    }
                }
                try {
                    await wallet.transfer(
                        auth,
                        await auth.getAddress(),
                        { to: await wallet.getAddress(), amount: 0.001, token: "eth" },
                        options
                    )
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("EnvOption.fee.token or EnvOption.gasSponsor.token is required")
                }
            })
            it("negative test - fee amount and gas percent not set", async () => {
                const options: GlobalEnvOption = {
                    apiKey: apiKey,
                    chain: config.chainId,
                    fee: {
                        token: baseToken,
                        recipient: await auth.getAddress()
                    }
                }
                try {
                    await wallet.transfer(
                        auth,
                        await auth.getAddress(),
                        { to: await wallet.getAddress(), amount: 0.001, token: "eth" },
                        options
                    )
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("EnvOption.fee.amount or EnvOption.fee.gasPercent is required")
                }
            })
            it("negative test - fee uses gas percent but charges erc20 tokens", async () => {
                const options: GlobalEnvOption = {
                    apiKey: apiKey,
                    chain: config.chainId,
                    fee: {
                        token: outToken,
                        gasPercent: 4, // 4%
                        recipient: await auth.getAddress()
                    }
                }
                try {
                    await wallet.transfer(
                        auth,
                        await auth.getAddress(),
                        { to: await wallet.getAddress(), amount: 0.001, token: "eth" },
                        options
                    )
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("GasPercent is only valid for native tokens")
                }
            })
        })
    })

    describe("Multi Sig Transfer", function () {
        this.timeout(300_000)
        let auth1: Auth
        let auth2: Auth
        let wallet: FunWallet
        let chain: Chain
        let baseTokenObj: Token

        let fun: FunKit

        const groupId: Hex = "0x149b4d0ada7707782e74fef64f083cda823f45213f99ff177d3327e9761a245b" // generateRandomGroupId()
        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth1 = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            auth2 = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })

            const users = [
                {
                    userId: groupId,
                    groupInfo: {
                        memberIds: [await auth1.getAddress(), await auth2.getAddress(), "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"],
                        threshold: 2
                    }
                }
            ]

            const uniqueId = await auth1.getWalletUniqueId(config.index ? config.index + 1 : 99976)

            wallet = await fun.createWalletWithUsersAndId(users, uniqueId, config.chainId)
            baseTokenObj = wallet.getToken(baseToken)

            chain = wallet.getChain()
            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await baseTokenObj.getBalance()) < prefundAmt) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.01)
            }
        })

        it("Group Wallet Create, Collect Sig, and Execute -- transfer base token", async () => {
            const randomAddress = randomBytes(20)

            const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b2 = await baseTokenObj.getBalance()

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: amount ? amount : 0.00001,
                token: "eth"
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(transferOp.opId!)

            // auth2 sign and execute the operation
            expect(await wallet.executeOperation(auth2, operation)).to.not.throw

            const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b4 = await baseTokenObj.getBalance()

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        it("Group Wallet Create, Execute Without Required Sigs -- transfer base token", async () => {
            const randomAddress = randomBytes(20)

            const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b2 = await baseTokenObj.getBalance()

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: amount ? amount : 0.00001,
                token: "eth"
            })

            // auth1 executes it without auth2 signature
            try {
                await wallet.executeOperation(auth1, transferOp)
            } catch (err) {
                if (!(err instanceof InvalidParameterError)) {
                    throw err
                }
            }

            const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b4 = await baseTokenObj.getBalance()

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer executed without required sigs")
            assert(walletTokenBalanceBefore === walletTokenBalanceAfter, "Transfer executed without required sigs")
        })

        it("Group Wallet Reject Op -- transfer base token", async () => {
            const randomAddress = randomBytes(20)
            const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: amount ? amount : 0.00001,
                token: "eth"
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(transferOp.opId!)

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

            const b2 = await fun.getTokenBalance(baseToken, randomAddress, chain)

            const [randomTokenBalanceBefore, randomTokenBalanceAfter] = await Promise.all([b1, b2])

            // wallet eth balance would change as rejection Op execution consumes gas
            assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer executed bad nonce")
        })

        it("Group Wallet Create, Remove Op -- transfer base token", async () => {
            const randomAddress = randomBytes(20)

            // const b1 = Token.getBalance(baseToken, randomAddress, chain)
            // const b2 = Token.getBalance(baseToken, walletAddress, chain)

            const b1 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b2 = await baseTokenObj.getBalance()

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: amount ? amount : 0.00001,
                token: "eth"
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth1 decides to remove the Op so other people can't see it
            expect(await wallet.removeOperation(auth1, transferOp.opId!)).to.not.throw

            // auth2 logs in and should not be able to find the operation.
            expect(await wallet.getOperation(transferOp.opId!)).to.throw

            // const b3 = Token.getBalance(baseToken, randomAddress, chain)
            // const b4 = Token.getBalance(baseToken, walletAddress, chain)

            const b3 = await fun.getTokenBalance(baseToken, randomAddress, chain)
            const b4 = await baseTokenObj.getBalance()

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer without enough signature")
            assert(walletTokenBalanceBefore === walletTokenBalanceAfter, "Transfer without enough signature")
        })
    })
}
