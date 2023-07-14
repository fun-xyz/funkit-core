import { assert } from "chai"
import { SessionKeyParams, createSessionUser } from "../../src/actions"
import { Auth, Eoa } from "../../src/auth"
import { AddressZero, ERC20_ABI, ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
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

    describe("Transfer", function () {
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
            auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.index ? config.index : 1792811340 })
            if (prefund) await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 1)
        })

        it("transfer baseToken directly", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()
            const b1 = Token.getBalanceBN(baseToken, randomAddress)
            const b2 = Token.getBalanceBN(baseToken, walletAddress)
            await wallet.transferEth(auth, { to: randomAddress, amount: config.amount ? config.amount : 0.001 })
            const b3 = Token.getBalanceBN(baseToken, randomAddress)
            const b4 = Token.getBalanceBN(baseToken, walletAddress)

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

                const outTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionData(outTokenAddress, "mint", [
                    await wallet.getAddress(),
                    1000000000000000000000n
                ])
                await chain.init()
                outTokenMint.chain = chain
                await auth.sendTx(outTokenMint)
            }

            const b1 = Token.getBalanceBN(outToken, randomAddress)
            const b2 = Token.getBalanceBN(outToken, walletAddress)
            const outTokenAddress = await new Token(outToken).getAddress()
            await wallet.transferERC20(auth, { to: randomAddress, amount: 1, token: outTokenAddress })
            const b3 = Token.getBalanceBN(outToken, randomAddress)
            const b4 = Token.getBalanceBN(outToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
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
                await wallet.createSessionKey(auth, sessionKeyParams)
            })

            it("wallet should have lower balance of specified token", async () => {
                const randomAddress = randomBytes(20)
                const walletAddress = await wallet.getAddress()
                const b1 = Token.getBalanceBN(outToken, randomAddress)
                const b2 = Token.getBalanceBN(outToken, walletAddress)
                const outTokenAddress = await new Token(outToken).getAddress()
                await wallet.transferERC20(user, { to: randomAddress, amount: 1, token: outTokenAddress })
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
                        await wallet.approveERC20(user, { spender: randomAddress, amount: 1, token: outTokenAddress })
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
                    await wallet.transferERC20(user, { to: randomAddress, amount: 1, token: outTokenAddress })
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
                    await wallet.transferERC20(user, { to: randomAddress, amount: 1, token: outTokenAddress })
                    assert(false, "call succeded when it should have failed")
                } catch (e: any) {
                    console.log(e.message)
                    assert(e.message.includes("FW406"), "call succeded when it should have failed")
                }
            })

            it("invalid fee", async () => {
                const waitTime = BigInt(Date.now())
                const diff = deadline * 1000n - waitTime
                if (diff > 0n) {
                    await new Promise((resolve) => setTimeout(resolve, Number(diff) * 1.1))
                }
                const randomAddress = randomBytes(20)
                const outTokenAddress = await new Token(outToken).getAddress()
                try {
                    await wallet.transferERC20(user, { to: randomAddress, amount: 1, token: outTokenAddress })
                    assert(false, "call succeded when it should have failed")
                } catch (e: any) {
                    console.log(e.message)
                    assert(e.message.includes("FW406"), "call succeded when it should have failed")
                }
            })
        })
    })
}
