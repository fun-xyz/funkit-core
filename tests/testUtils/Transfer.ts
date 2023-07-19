import { assert, expect } from "chai"
import { Hex } from "viem"
import { SessionKeyParams, createSessionUser } from "../../src/actions"
import { Auth } from "../../src/auth"
import { AddressZero, ERC20_ABI, ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { EnvOption, GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { InternalFailureError, InvalidParameterError } from "../../src/errors"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface TransferTestConfig {
    chainId: number
    outToken: string
    baseToken: string
    prefund: boolean
    index?: number
    amount?: number
    prefundAmt?: number
    numRetry?: number
}

export const TransferTest = (config: TransferTestConfig) => {
    const { outToken, baseToken, prefund, prefundAmt } = config

    describe("Single Auth Transfer", function () {
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

        it("transfer baseToken directly", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(baseToken, randomAddress)
            const b2 = Token.getBalance(baseToken, walletAddress)
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
            })
            await wallet.executeOperation(auth, userOp)
            const b3 = Token.getBalance(baseToken, randomAddress)
            const b4 = Token.getBalance(baseToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        it("wallet should have lower balance of specified token", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()
            if (config.chainId === 5) {
                const chain = await getChainFromData(config.chainId)
                const outTokenAddress = await Token.getAddress(outToken)

                const outTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(outTokenAddress, "mint", [
                    await wallet.getAddress(),
                    1000000000000000000000n
                ])
                await chain.init()
                await auth.sendTx({ ...outTokenMint, chain })
            }

            const b1 = Token.getBalanceBN(outToken, randomAddress)
            const b2 = Token.getBalanceBN(outToken, walletAddress)
            const outTokenAddress = await new Token(outToken).getAddress()
            const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: randomAddress, amount: 1, token: outTokenAddress })
            await wallet.executeOperation(auth, userOp)
            const b3 = Token.getBalanceBN(outToken, randomAddress)
            const b4 = Token.getBalanceBN(outToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        describe("Transaction Fees enabled", function () {
            it("pay a fixed amount of fees in eth", async function () {
                const randomAddress = randomBytes(20)
                const feeRecipientAddress = randomBytes(20)
                const walletAddress = await wallet.getAddress()

                const b1 = Token.getBalance(baseToken, randomAddress)
                const b2 = Token.getBalance(baseToken, walletAddress)
                const b5 = Token.getBalance(baseToken, feeRecipientAddress)
                const fee = 0.001
                const options: EnvOption = {
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
                        amount: config.amount ? config.amount : 0.001
                    },
                    options
                )
                await wallet.executeOperation(auth, userOp)

                const b3 = Token.getBalance(baseToken, randomAddress)
                const b4 = Token.getBalance(baseToken, walletAddress)
                const b6 = Token.getBalance(baseToken, feeRecipientAddress)

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
                assert.closeTo(Number(feeRecipientBalanceAfter) - Number(feeRecipientBalanceBefore), fee, fee / 10, "Transfer failed")
            })
            it("pay a fixed amount of fees in tokens", async function () {
                const randomAddress = randomBytes(20)
                const feeRecipientAddress = randomBytes(20)
                const walletAddress = await wallet.getAddress()

                const b1 = Token.getBalance(baseToken, randomAddress)
                const b2 = Token.getBalance(baseToken, walletAddress)
                const b5 = Token.getBalance(outToken, feeRecipientAddress)
                const fee = 0.001
                const options: EnvOption = {
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
                        amount: config.amount ? config.amount : 0.001
                    },
                    options
                )
                await wallet.executeOperation(auth, userOp)

                const b3 = Token.getBalance(baseToken, randomAddress)
                const b4 = Token.getBalance(baseToken, walletAddress)
                const b6 = Token.getBalance(outToken, feeRecipientAddress)

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
                assert.closeTo(Number(feeRecipientBalanceAfter) - Number(feeRecipientBalanceBefore), fee, fee / 10, "Transfer failed")
            })

            it("pay a percentage of gas for fees", async () => {
                const randomAddress = randomBytes(20)
                const walletAddress = await wallet.getAddress()

                const b1 = Token.getBalance(baseToken, randomAddress)
                const b2 = Token.getBalance(baseToken, walletAddress)
                const b5 = Token.getBalance(baseToken, await auth.getAddress())
                const options: EnvOption = {
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
                        amount: config.amount ? config.amount : 0.001
                    },
                    options
                )
                await wallet.executeOperation(auth, userOp)

                const b3 = Token.getBalance(baseToken, randomAddress)
                const b4 = Token.getBalance(baseToken, walletAddress)
                const b6 = Token.getBalance(baseToken, await auth.getAddress())

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
                assert(feeRecipientBalanceAfter > feeRecipientBalanceBefore, "Transfer failed")
            })

            it("negative test - fee token and gas token not set", async () => {
                const fee = 0.001
                const options: EnvOption = {
                    chain: config.chainId,
                    fee: {
                        amount: fee,
                        recipient: await auth.getAddress()
                    }
                }
                try {
                    await wallet.transfer(auth, await auth.getAddress(), { to: await wallet.getAddress(), amount: 0.001 }, options)
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("EnvOption.fee.token or EnvOption.gasSponsor.token is required")
                }
            })
            it("negative test - fee recipient not set", async () => {
                const fee = 0.001
                const options: EnvOption = {
                    chain: config.chainId,
                    fee: {
                        token: baseToken,
                        amount: fee
                    }
                }
                try {
                    await wallet.transfer(auth, await auth.getAddress(), { to: await wallet.getAddress(), amount: 0.001 }, options)
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("EnvOption.fee.recipient is required")
                }
            })
            it("negative test - fee amount and gas percent not set", async () => {
                const options: EnvOption = {
                    chain: config.chainId,
                    fee: {
                        token: baseToken,
                        recipient: await auth.getAddress()
                    }
                }
                try {
                    await wallet.transfer(auth, await auth.getAddress(), { to: await wallet.getAddress(), amount: 0.001 }, options)
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("fee.amount or fee.gasPercent is required")
                }
            })
            it("negative test - fee uses gas percent but charges erc20 tokens", async () => {
                const options: EnvOption = {
                    chain: config.chainId,
                    fee: {
                        token: outToken,
                        gasPercent: 4, // 4%
                        recipient: await auth.getAddress()
                    }
                }
                try {
                    await wallet.transfer(auth, await auth.getAddress(), { to: await wallet.getAddress(), amount: 0.001 }, options)
                    expect.fail("Should throw error")
                } catch (error: any) {
                    expect(error.message).to.include("gasPercent is only valid for native tokens")
                }
            })
        })

        describe("With Session Key", () => {
            const user = createSessionUser()
            const second = 1000
            const minute = 60 * second
            const deadline = BigInt(Date.now() + 3 * minute) / 1000n
            const feeRecip = randomBytes(20)
            before(async () => {
                const basetokenAddr = await Token.getAddress(baseToken)
                const sessionKeyParams: SessionKeyParams = {
                    user,
                    targetWhitelist: [outToken, basetokenAddr],
                    actionWhitelist: [
                        {
                            abi: ERC20_ABI,
                            functionWhitelist: ["transfer"]
                        }
                    ],
                    feeTokenWhitelist: [AddressZero],
                    feeRecipientWhitelist: [feeRecip],
                    deadline,
                    chainId: config.chainId
                }
                const operation = await wallet.createSessionKey(auth, await auth.getAddress(), sessionKeyParams)
                await wallet.executeOperation(auth, operation)
            })

            it("wallet should have lower balance of specified token", async () => {
                const randomAddress = randomBytes(20)
                const walletAddress = await wallet.getAddress()
                const b1 = Token.getBalanceBN(outToken, randomAddress)
                const b2 = Token.getBalanceBN(outToken, walletAddress)
                const outTokenAddress = await new Token(outToken).getAddress()
                const operation = await wallet.transfer(user, await user.getAddress(), {
                    to: randomAddress,
                    amount: 1,
                    token: outTokenAddress
                })
                await wallet.executeOperation(user, operation)
                const b3 = Token.getBalanceBN(outToken, randomAddress)
                const b4 = Token.getBalanceBN(outToken, walletAddress)

                const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                    await Promise.all([b1, b2, b3, b4])

                assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
                assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
            })

            it("Session key function out of scope", async () => {
                it("Session key selector out of scope", async () => {
                    const randomAddress = randomBytes(20)
                    const outTokenAddress = await new Token("usdc").getAddress()
                    try {
                        const operation = await wallet.tokenApprove(user, await user.getAddress(), {
                            spender: randomAddress,
                            amount: 1,
                            token: outTokenAddress
                        })
                        await wallet.executeOperation(user, operation)
                        assert(false, "call succeded when it should have failed")
                    } catch {
                        assert(true)
                    }
                })
            })

            it("Session key target out of scope", async () => {
                const randomAddress = randomBytes(20)
                const outTokenAddress = await new Token("usdc").getAddress()
                try {
                    const operation = await wallet.transfer(user, await user.getAddress(), {
                        to: randomAddress,
                        amount: 1,
                        token: outTokenAddress
                    })
                    await wallet.executeOperation(user, operation)
                    assert(false, "call succeded when it should have failed")
                } catch (e: any) {
                    assert(
                        e.message.includes("Function or target is not allowed in session key"),
                        "call succeded when it should have failed"
                    )
                }
            })

            it("Session key expires", async () => {
                const waitTime = BigInt(Date.now())
                const diff = deadline * 1000n - waitTime
                if (diff > 0n) {
                    await new Promise((resolve) => setTimeout(resolve, Number(diff) * 1.1))
                }
                const randomAddress = randomBytes(20)
                const outTokenAddress = await new Token(outToken).getAddress()
                try {
                    const operation = await wallet.transfer(user, await user.getAddress(), {
                        to: randomAddress,
                        amount: 1,
                        token: outTokenAddress
                    })
                    await wallet.executeOperation(user, operation)
                    assert(false, "call succeded when it should have failed")
                } catch (e: any) {
                    assert(e.message.includes("FW406"), "call succeded when it should have failed")
                }
            })
        })
    })

    describe("Multi Sig Transfer", function () {
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

        it("Group Wallet Create, Collect Sig, and Execute -- transfer base token", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(baseToken, randomAddress)
            const b2 = Token.getBalance(baseToken, walletAddress)

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth2 logs in and finds out the pending operation.
            // We use getOperation here to specifically get the operation, but in production custoemr would choose one
            // const operations = await wallet.getOperations(OperationStatus.PENDING)
            const operation = await wallet.getOperation(transferOp.opId!)

            // auth2 sign and execute the operation
            expect(await wallet.executeOperation(auth2, operation)).to.not.throw

            const b3 = Token.getBalance(baseToken, randomAddress)
            const b4 = Token.getBalance(baseToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        it("Group Wallet Create, Execute Without Required Sigs -- transfer base token", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(baseToken, randomAddress)
            const b2 = Token.getBalance(baseToken, walletAddress)

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
            })

            // auth1 executes it without auth2 signature
            try {
                await wallet.executeOperation(auth1, transferOp)
            } catch (err) {
                if (!(err instanceof InvalidParameterError)) {
                    throw err
                }
            }

            const b3 = Token.getBalance(baseToken, randomAddress)
            const b4 = Token.getBalance(baseToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer executed without required sigs")
            assert(walletTokenBalanceBefore === walletTokenBalanceAfter, "Transfer executed without required sigs")
        })

        it("Group Wallet Reject Op -- transfer base token", async () => {
            const randomAddress = randomBytes(20)
            const b1 = Token.getBalance(baseToken, randomAddress)

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
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

            const b2 = Token.getBalance(baseToken, randomAddress)

            const [randomTokenBalanceBefore, randomTokenBalanceAfter] = await Promise.all([b1, b2])

            // wallet eth balance would change as rejection Op execution consumes gas
            assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer executed bad nonce")
        })

        it("Group Wallet Create, Remove Op -- transfer base token", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(baseToken, randomAddress)
            const b2 = Token.getBalance(baseToken, walletAddress)

            // auth1 creates and signs the transfer operation, the operation should be stored into DDB
            const transferOp = await wallet.transfer(auth1, groupId, {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
            })

            // wait for DDB to replicate the operation data
            await new Promise((r) => setTimeout(r, 2000))

            // auth1 decides to remove the Op so other people can't see it
            expect(await wallet.removeOperation(auth1, transferOp.opId!)).to.not.throw

            // auth2 logs in and should not be able to find the operation.
            expect(await wallet.getOperation(transferOp.opId!)).to.throw

            const b3 = Token.getBalance(baseToken, randomAddress)
            const b4 = Token.getBalance(baseToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer without enough signature")
            assert(walletTokenBalanceBefore === walletTokenBalanceAfter, "Transfer without enough signature")
        })
    })
}
