import { assert, expect } from "chai"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption } from "../../src/config"
import { Token } from "../../src/data"
import { FunKit } from "../../src/FunKit"
import { fundWallet, isContract } from "../../src/utils"
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

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                apiKey: apiKey,
                gasSponsor: {}
            }
            // await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            // wallet = new FunWallet({
            //     users: [{ userId: await auth.getAddress() }],
            //     uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1992811349)
            // })

            const fun = new FunKit(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })

            wallet = await fun.createWalletFromAuth(auth, config.index ? config.index : 1992811349, config.chainId)

            console.log("wallet", wallet)

            // const chain = await Chain.getChain({ chainIdentifier: config.chainId })

            const chain = wallet.getChain()

            if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            const baseTokenObj: Token = await wallet.getToken(baseToken)
            if (Number(await baseTokenObj.getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }
            // if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < prefundAmt) {
            //     await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            // }

            const outTokenObj: Token = await wallet.getToken(outToken)
            const outTokenPrefundAmount = outTokenPrefund ? outTokenPrefund : 0.01
            if (Number(await outTokenObj.getBalance()) < outTokenPrefundAmount) {
                await fundWallet(auth, wallet, outTokenPrefundAmount)
            }

            // if (Number(await Token.getBalance(outToken, await wallet.getAddress())) < outTokenPrefundAmount) {
            //     await auth.sendTx(await new Token(outToken).transfer(await wallet.getAddress(), outTokenPrefundAmount))
            // }
        })

        it.only("transfer baseToken directly", async () => {
            const randomAddress = await auth.getAddress()
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(baseToken, randomAddress)
            const b2 = Token.getBalance(baseToken, walletAddress)
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: randomAddress,
                amount: amount ? amount : 0.00001,
                token: "eth"
            })
            expect(await wallet.executeOperation(auth, userOp)).to.not.throw
            const b3 = Token.getBalance(baseToken, randomAddress)
            const b4 = Token.getBalance(baseToken, walletAddress)

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
            const outTokenObj = new Token(outToken)
            const outTokenAddress = await outTokenObj.getAddress()
            if (config.chainId === 5) {
                const outTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(outTokenAddress, "mint", [
                    await wallet.getAddress(),
                    await outTokenObj.getDecimalAmount(100)
                ])
                await auth.sendTx({ ...outTokenMint })
            }

            const b1 = Token.getBalanceBN(outToken, await auth.getAddress())
            const b2 = Token.getBalanceBN(outToken, await wallet.getAddress())
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: await auth.getAddress(),
                amount: outTokenPrefund ? outTokenPrefund / 2 : 0.00001,
                token: outTokenAddress
            })
            expect(await wallet.executeOperation(auth, userOp)).to.not.throw
            const b3 = Token.getBalanceBN(outToken, await auth.getAddress())
            const b4 = Token.getBalanceBN(outToken, await wallet.getAddress())

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

        // describe("Transaction Fees enabled", function () {
        //     it("pay a fixed amount of fees in eth", async function () {
        //         const randomAddress = randomBytes(20)
        //         const feeRecipientAddress = randomBytes(20)
        //         const walletAddress = await wallet.getAddress()

        //         const b1 = Token.getBalance(baseToken, randomAddress)
        //         const b2 = Token.getBalance(baseToken, walletAddress)
        //         const b5 = Token.getBalance(baseToken, feeRecipientAddress)
        //         const fee = outTokenPrefund ? outTokenPrefund / 10 : 0.00001
        //         const options: EnvOption = {
        //             chain: config.chainId,
        //             fee: {
        //                 token: baseToken,
        //                 amount: fee,
        //                 recipient: feeRecipientAddress
        //             }
        //         }

        //         const userOp = await wallet.transfer(
        //             auth,
        //             await auth.getAddress(),
        //             {
        //                 to: randomAddress,
        //                 amount: amount ? amount : 0.00001,
        //                 token: "eth"
        //             },
        //             options
        //         )

        //         expect(await wallet.executeOperation(auth, userOp)).to.not.throw

        //         const b3 = Token.getBalance(baseToken, randomAddress)
        //         const b4 = Token.getBalance(baseToken, walletAddress)
        //         const b6 = Token.getBalance(baseToken, feeRecipientAddress)

        //         const [
        //             randomTokenBalanceBefore,
        //             walletTokenBalanceBefore,
        //             randomTokenBalanceAfter,
        //             walletTokenBalanceAfter,
        //             feeRecipientBalanceBefore,
        //             feeRecipientBalanceAfter
        //         ] = await Promise.all([b1, b2, b3, b4, b5, b6])
        //         assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
        //         assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        //         assert.closeTo(Number(feeRecipientBalanceAfter) - Number(feeRecipientBalanceBefore), fee, fee / 9, "Transfer failed")
        //     })

        //     it("pay a fixed amount of fees in tokens", async function () {
        //         const randomAddress = randomBytes(20)
        //         const feeRecipientAddress = randomBytes(20)
        //         const walletAddress = await wallet.getAddress()

        //         const b1 = Token.getBalance(baseToken, randomAddress)
        //         const b2 = Token.getBalance(baseToken, walletAddress)
        //         const b5 = Token.getBalance(outToken, feeRecipientAddress)
        //         const fee = outTokenPrefund ? outTokenPrefund / 2 : 0.00001
        //         const options: EnvOption = {
        //             chain: config.chainId,
        //             fee: {
        //                 token: outToken,
        //                 amount: fee,
        //                 recipient: feeRecipientAddress
        //             }
        //         }

        //         const userOp = await wallet.transfer(
        //             auth,
        //             await auth.getAddress(),
        //             {
        //                 to: randomAddress,
        //                 amount: amount ? amount : 0.00001,
        //                 token: "eth"
        //             },
        //             options
        //         )
        //         expect(await wallet.executeOperation(auth, userOp)).to.not.throw

        //         const b3 = Token.getBalance(baseToken, randomAddress)
        //         const b4 = Token.getBalance(baseToken, walletAddress)
        //         const b6 = Token.getBalance(outToken, feeRecipientAddress)

        //         const [
        //             randomTokenBalanceBefore,
        //             walletTokenBalanceBefore,
        //             randomTokenBalanceAfter,
        //             walletTokenBalanceAfter,
        //             feeRecipientBalanceBefore,
        //             feeRecipientBalanceAfter
        //         ] = await Promise.all([b1, b2, b3, b4, b5, b6])

        //         assert(
        //             randomTokenBalanceAfter > randomTokenBalanceBefore,
        //             `Transfer failed, ${randomTokenBalanceBefore}, ${randomTokenBalanceAfter}`
        //         )
        //         assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        //         assert.closeTo(Number(feeRecipientBalanceAfter) - Number(feeRecipientBalanceBefore), fee, fee / 9, "Transfer failed")
        //     })

        //     it("pay a percentage of gas for fees", async () => {
        //         const randomAddress = randomBytes(20)
        //         const walletAddress = await wallet.getAddress()

        //         const b1 = Token.getBalance(baseToken, randomAddress)
        //         const b2 = Token.getBalance(baseToken, walletAddress)
        //         const b5 = Token.getBalance(baseToken, await auth.getAddress())
        //         const options: EnvOption = {
        //             chain: config.chainId,
        //             fee: {
        //                 token: baseToken,
        //                 gasPercent: 1,
        //                 recipient: await auth.getAddress()
        //             }
        //         }

        //         const userOp = await wallet.transfer(
        //             auth,
        //             await auth.getAddress(),
        //             {
        //                 to: randomAddress,
        //                 amount: amount ? amount : 0.00001,
        //                 token: "eth"
        //             },
        //             options
        //         )
        //         expect(await wallet.executeOperation(auth, userOp)).to.not.throw

        //         const b3 = Token.getBalance(baseToken, randomAddress)
        //         const b4 = Token.getBalance(baseToken, walletAddress)
        //         const b6 = Token.getBalance(baseToken, await auth.getAddress())

        //         const [
        //             randomTokenBalanceBefore,
        //             walletTokenBalanceBefore,
        //             randomTokenBalanceAfter,
        //             walletTokenBalanceAfter,
        //             feeRecipientBalanceBefore,
        //             feeRecipientBalanceAfter
        //         ] = await Promise.all([b1, b2, b3, b4, b5, b6])

        //         assert(
        //             randomTokenBalanceAfter > randomTokenBalanceBefore,
        //             `Transfer failed, ${randomTokenBalanceAfter} ${randomTokenBalanceBefore}`
        //         )
        //         assert(
        //             walletTokenBalanceBefore > walletTokenBalanceAfter,
        //             `Transfer failed, ${walletTokenBalanceBefore} ${walletTokenBalanceAfter}`
        //         )
        //         assert(
        //             feeRecipientBalanceAfter > feeRecipientBalanceBefore,
        //             `Transfer failed, ${feeRecipientBalanceAfter} ${feeRecipientBalanceBefore}`
        //         )
        //     })

        //     it("negative test - fee token and gas token not set", async () => {
        //         const fee = 0.001
        //         const options: EnvOption = {
        //             chain: config.chainId,
        //             fee: {
        //                 amount: fee,
        //                 recipient: await auth.getAddress()
        //             }
        //         }
        //         try {
        //             await wallet.transfer(
        //                 auth,
        //                 await auth.getAddress(),
        //                 { to: await wallet.getAddress(), amount: 0.001, token: "eth" },
        //                 options
        //             )
        //             expect.fail("Should throw error")
        //         } catch (error: any) {
        //             expect(error.message).to.include("EnvOption.fee.token or EnvOption.gasSponsor.token is required")
        //         }
        //     })
        //     it("negative test - fee amount and gas percent not set", async () => {
        //         const options: EnvOption = {
        //             chain: config.chainId,
        //             fee: {
        //                 token: baseToken,
        //                 recipient: await auth.getAddress()
        //             }
        //         }
        //         try {
        //             await wallet.transfer(
        //                 auth,
        //                 await auth.getAddress(),
        //                 { to: await wallet.getAddress(), amount: 0.001, token: "eth" },
        //                 options
        //             )
        //             expect.fail("Should throw error")
        //         } catch (error: any) {
        //             expect(error.message).to.include("EnvOption.fee.amount or EnvOption.fee.gasPercent is required")
        //         }
        //     })
        //     it("negative test - fee uses gas percent but charges erc20 tokens", async () => {
        //         const options: EnvOption = {
        //             chain: config.chainId,
        //             fee: {
        //                 token: outToken,
        //                 gasPercent: 4, // 4%
        //                 recipient: await auth.getAddress()
        //             }
        //         }
        //         try {
        //             await wallet.transfer(
        //                 auth,
        //                 await auth.getAddress(),
        //                 { to: await wallet.getAddress(), amount: 0.001, token: "eth" },
        //                 options
        //             )
        //             expect.fail("Should throw error")
        //         } catch (error: any) {
        //             expect(error.message).to.include("GasPercent is only valid for native tokens")
        //         }
        //     })
        // })
    })

    // describe("Multi Sig Transfer", function () {
    //     this.timeout(300_000)
    //     let auth1: Auth
    //     let auth2: Auth
    //     let wallet: FunWallet
    //     const groupId: Hex = "0x149b4d0ada7707782e74fef64f083cda823f45213f99ff177d3327e9761a245b" // generateRandomGroupId()
    //     before(async function () {
    //         this.retries(config.numRetry ? config.numRetry : 0)
    //         const apiKey = await getTestApiKey()
    //         const options: GlobalEnvOption = {
    //             chain: config.chainId,
    //             apiKey: apiKey,
    //             gasSponsor: {}
    //         }
    //         await configureEnvironment(options)
    //         auth1 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
    //         auth2 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })
    //         wallet = new FunWallet({
    //             users: [
    //                 {
    //                     userId: groupId,
    //                     groupInfo: {
    //                         memberIds: [await auth1.getAddress(), await auth2.getAddress(), "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"],
    //                         threshold: 2
    //                     }
    //                 }
    //             ],
    //             uniqueId: await auth1.getWalletUniqueId(config.index ? config.index + 1 : 99976)
    //         })

    //         const chain = await Chain.getChain({ chainIdentifier: config.chainId })
    //         if (!(await isContract(await wallet.getAddress(), await chain.getClient()))) {
    //             await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.2)
    //         }
    //         if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < prefundAmt) {
    //             await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.01)
    //         }
    //     })

    //     it("Group Wallet Create, Collect Sig, and Execute -- transfer base token", async () => {
    //         const randomAddress = randomBytes(20)
    //         const walletAddress = await wallet.getAddress()

    //         const b1 = Token.getBalance(baseToken, randomAddress)
    //         const b2 = Token.getBalance(baseToken, walletAddress)

    //         // auth1 creates and signs the transfer operation, the operation should be stored into DDB
    //         const transferOp = await wallet.transfer(auth1, groupId, {
    //             to: randomAddress,
    //             amount: amount ? amount : 0.00001,
    //             token: "eth"
    //         })

    //         // wait for DDB to replicate the operation data
    //         await new Promise((r) => setTimeout(r, 2000))

    //         // auth2 logs in and finds out the pending operation.
    //         // We use getOperation here to specifically get the operation, but in production custoemr would choose one
    //         // const operations = await wallet.getOperations(OperationStatus.PENDING)
    //         const operation = await wallet.getOperation(transferOp.opId!)

    //         // auth2 sign and execute the operation
    //         expect(await wallet.executeOperation(auth2, operation)).to.not.throw

    //         const b3 = Token.getBalance(baseToken, randomAddress)
    //         const b4 = Token.getBalance(baseToken, walletAddress)

    //         const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
    //             await Promise.all([b1, b2, b3, b4])

    //         assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
    //         assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
    //     })

    //     it("Group Wallet Create, Execute Without Required Sigs -- transfer base token", async () => {
    //         const randomAddress = randomBytes(20)
    //         const walletAddress = await wallet.getAddress()

    //         const b1 = Token.getBalance(baseToken, randomAddress)
    //         const b2 = Token.getBalance(baseToken, walletAddress)

    //         // auth1 creates and signs the transfer operation, the operation should be stored into DDB
    //         const transferOp = await wallet.transfer(auth1, groupId, {
    //             to: randomAddress,
    //             amount: amount ? amount : 0.00001,
    //             token: "eth"
    //         })

    //         // auth1 executes it without auth2 signature
    //         try {
    //             await wallet.executeOperation(auth1, transferOp)
    //         } catch (err) {
    //             if (!(err instanceof InvalidParameterError)) {
    //                 throw err
    //             }
    //         }

    //         const b3 = Token.getBalance(baseToken, randomAddress)
    //         const b4 = Token.getBalance(baseToken, walletAddress)

    //         const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
    //             await Promise.all([b1, b2, b3, b4])

    //         assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer executed without required sigs")
    //         assert(walletTokenBalanceBefore === walletTokenBalanceAfter, "Transfer executed without required sigs")
    //     })

    //     it("Group Wallet Reject Op -- transfer base token", async () => {
    //         const randomAddress = randomBytes(20)
    //         const b1 = Token.getBalance(baseToken, randomAddress)

    //         // auth1 creates and signs the transfer operation, the operation should be stored into DDB
    //         const transferOp = await wallet.transfer(auth1, groupId, {
    //             to: randomAddress,
    //             amount: amount ? amount : 0.00001,
    //             token: "eth"
    //         })

    //         // wait for DDB to replicate the operation data
    //         await new Promise((r) => setTimeout(r, 2000))

    //         // auth2 logs in and finds out the pending operation.
    //         // We use getOperation here to specifically get the operation, but in production custoemr would choose one
    //         // const operations = await wallet.getOperations(OperationStatus.PENDING)
    //         const operation = await wallet.getOperation(transferOp.opId!)

    //         // auth2 rejects the operation
    //         const rejectionOp = await wallet.createRejectOperation(auth2, groupId, operation, "Op should be rejected")

    //         // wait for DDB to replicate the operation data
    //         await new Promise((r) => setTimeout(r, 2000))

    //         // auth1 logs in and finds out the rejection operation
    //         const rejection = await wallet.getOperation(rejectionOp.opId!)

    //         expect(await wallet.executeOperation(auth1, rejection)).to.not.throw

    //         // now we try to use auth2 to sign the original op and execute it
    //         try {
    //             await wallet.executeOperation(auth2, operation)
    //         } catch (err: any) {
    //             if (!(err instanceof InternalFailureError) && err.errorCode === "UserOpFailureError") {
    //                 throw err
    //             }
    //         }

    //         const b2 = Token.getBalance(baseToken, randomAddress)

    //         const [randomTokenBalanceBefore, randomTokenBalanceAfter] = await Promise.all([b1, b2])

    //         // wallet eth balance would change as rejection Op execution consumes gas
    //         assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer executed bad nonce")
    //     })

    //     it("Group Wallet Create, Remove Op -- transfer base token", async () => {
    //         const randomAddress = randomBytes(20)
    //         const walletAddress = await wallet.getAddress()

    //         const b1 = Token.getBalance(baseToken, randomAddress)
    //         const b2 = Token.getBalance(baseToken, walletAddress)

    //         // auth1 creates and signs the transfer operation, the operation should be stored into DDB
    //         const transferOp = await wallet.transfer(auth1, groupId, {
    //             to: randomAddress,
    //             amount: amount ? amount : 0.00001,
    //             token: "eth"
    //         })

    //         // wait for DDB to replicate the operation data
    //         await new Promise((r) => setTimeout(r, 2000))

    //         // auth1 decides to remove the Op so other people can't see it
    //         expect(await wallet.removeOperation(auth1, transferOp.opId!)).to.not.throw

    //         // auth2 logs in and should not be able to find the operation.
    //         expect(await wallet.getOperation(transferOp.opId!)).to.throw

    //         const b3 = Token.getBalance(baseToken, randomAddress)
    //         const b4 = Token.getBalance(baseToken, walletAddress)

    //         const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
    //             await Promise.all([b1, b2, b3, b4])

    //         assert(randomTokenBalanceAfter === randomTokenBalanceBefore, "Transfer without enough signature")
    //         assert(walletTokenBalanceBefore === walletTokenBalanceAfter, "Transfer without enough signature")
    //     })
    // })
}
