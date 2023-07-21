import { assert, expect } from "chai"
import { Hex } from "viem"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { InternalFailureError, InvalidParameterError } from "../../src/errors"
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
    const { outToken, baseToken, prefund, prefundAmt } = config

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
                uniqueId: await auth.getWalletUniqueId(
                    config.chainId.toString(),
                    config.index ? config.index : Math.floor(Math.random() * 100000)
                )
            })
            if (prefund) await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 1)
        })

        it("transfer baseToken(ETH)", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const recipientBalanceBefore = await Token.getBalance(baseToken, randomAddress)
            const walletBalanceBefore = await Token.getBalance(baseToken, walletAddress)
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: randomAddress,
                amount: config.amount ? config.amount : 0.001
            })
            await wallet.executeOperation(auth, userOp)
            const recipientBalanceAfter = await Token.getBalance(baseToken, randomAddress)
            const walletBalanceAfter = await Token.getBalance(baseToken, walletAddress)

            assert(recipientBalanceBefore > recipientBalanceAfter, "Transfer failed - recipient didn't receive ETH")
            assert(walletBalanceBefore > walletBalanceAfter, "Transfer failed - wallet didn't lose ETH")
        })

        it("transfer ERC20 tokens", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()
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

            const recipientBalanceBefore = await Token.getBalanceBN(outToken, randomAddress)
            const walletBalanceBefore = await Token.getBalanceBN(outToken, walletAddress)
            const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: randomAddress, amount: 1, token: outTokenAddress })
            await wallet.executeOperation(auth, userOp)
            const recipientBalanceAfter = await Token.getBalanceBN(outToken, randomAddress)
            const walletBalanceAfter = await Token.getBalanceBN(outToken, walletAddress)

            assert(recipientBalanceAfter > recipientBalanceBefore, "Transfer failed - recipient didn't receive ERC20")
            assert(walletBalanceAfter > walletBalanceBefore, "Transfer failed - wallet didn't lose ERC20")
        })
    })

    describe.skip("Multi Sig Transfer", function () {
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
