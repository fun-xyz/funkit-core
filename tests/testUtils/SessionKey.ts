import { assert } from "chai"
import { randInt } from "./utils"
import { SessionKeyParams, createSessionUser } from "../../src/actions"
import { Auth } from "../../src/auth"
import { AddressZero, ERC20_ABI } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface SessionKeyTestConfig {
    chainId: number
    outToken: string
    baseToken: string
    prefund: boolean
    index?: number
    amount?: number
    prefundAmt?: number
    numRetry?: number
}

export const SessionKeyTest = (config: SessionKeyTestConfig) => {
    const { outToken, baseToken, prefund, prefundAmt } = config

    describe("Single Auth SessionKey", function () {
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
                            functionWhitelist: ["approve"]
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

            it("wallet should have lower allowance of specified token", async () => {
                const randomAddress = randomBytes(20)
                const walletAddress = await wallet.getAddress()
                const outTokenAddress = await new Token(outToken).getAddress()
                const randomApproveAmount = randInt(10000)
                const operation = await wallet.tokenApprove(user, await user.getAddress(), {
                    spender: randomAddress,
                    amount: randomApproveAmount,
                    token: outTokenAddress
                })
                await wallet.executeOperation(user, operation)
                await new Promise((resolve) => {
                    setTimeout(resolve, 5000)
                })
                const postApprove = await Token.getApproval(outToken, walletAddress, randomAddress)

                assert(BigInt(randomApproveAmount) === postApprove, "Approve failed")
            })

            it("Session key function out of scope", async () => {
                it("Session key selector out of scope", async () => {
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
                        assert(e.message.includes("FW"))
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
                    const operation = await wallet.tokenApprove(user, await user.getAddress(), {
                        spender: randomAddress,
                        amount: 1,
                        token: outTokenAddress
                    })
                    await wallet.executeOperation(user, operation)
                    assert(false, "call succeded when it should have failed")
                } catch (e: any) {
                    console.log(e)
                    assert(e.message.includes("FW406"), "call succeded when it should have failed")
                }
            })
        })
    })
}