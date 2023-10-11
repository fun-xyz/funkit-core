import { Auth } from "../../src/auth"
import { TurnkeyAuth } from "../../src/auth/TurnkeyAuth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface TurnkeyTestConfig {
    chainId: number
    outToken: string
    baseToken: string
    index?: number
    amount?: number
    prefundAmt: number
    numRetry?: number
}

export const TurnkeyTest = (config: TurnkeyTestConfig) => {
    // const { outToken, baseToken, prefundAmt } = config

    describe("Turnkey Passkeys", function () {
        this.timeout(300_000)
        let auth: Auth
        let wallet: FunWallet

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            await configureEnvironment(options)
            // auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            // wallet = new FunWallet({
            //     users: [{ userId: await auth.getAddress() }],
            //     uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1992811349)
            // })

            // if (!(await wallet.getDeploymentStatus())) {
            //     await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            // }
            // if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < prefundAmt) {
            //     await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            // }
        })

        it("Create Auth", async () => {
            auth = new TurnkeyAuth("localhost")
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1992811349)
            })
            console.log("wallet", await wallet.getAddress())
        })

        // describe("With Session Key", () => {
        //     let user: SessionKeyAuth
        //     const sessionKeyPrivateKey = randomBytes(32)
        //     const ruleId = generateRuleId()
        //     const roleId = generateRoleId()
        //     const minute = 60 * 1000
        //     let deadline
        //     let outtokenAddr
        //     let basetokenAddr
        //     const feeRecip = randomBytes(20)
        //     before(async () => {
        //         deadline = (Date.now() + 3 * minute) / 1000
        //         basetokenAddr = await Token.getAddress(baseToken)
        //         outtokenAddr = await Token.getAddress(outToken)
        //         const sessionKeyParams: SessionKeyParams = {
        //             targetWhitelist: [outtokenAddr, basetokenAddr],
        //             actionWhitelist: [
        //                 {
        //                     abi: ERC20_ABI,
        //                     functionWhitelist: ["approve"]
        //                 }
        //             ],
        //             feeTokenWhitelist: [AddressZero],
        //             feeRecipientWhitelist: [feeRecip],
        //             deadline,
        //             ruleId: ruleId,
        //             roleId: roleId
        //         }
        //         user = await createSessionUser({ privateKey: sessionKeyPrivateKey }, sessionKeyParams)
        //         sessionKeyParams.userId = await user.getUserId()
        //         const operation = await wallet.createSessionKey(auth, await auth.getAddress(), sessionKeyParams)
        //         await wallet.executeOperation(auth, operation)
        //     })

        //     it("wallet should have lower allowance of specified token", async () => {
        //         const randomAddress = randomBytes(20)
        //         const walletAddress = await wallet.getAddress()
        //         const outTokenAddress = await new Token(outToken).getAddress()
        //         const randomApproveAmount = randInt(10000)
        //         const operation = await wallet.tokenApprove(user, await user.getAddress(), {
        //             spender: randomAddress,
        //             amount: randomApproveAmount,
        //             token: outTokenAddress
        //         })
        //         await wallet.executeOperation(user, operation)
        //         await new Promise((resolve) => {
        //             setTimeout(resolve, 5000)
        //         })
        //         const postApprove = await Token.getApproval(outToken, walletAddress, randomAddress)

        //         assert(BigInt(await new Token(outTokenAddress).getDecimalAmount(randomApproveAmount)) === postApprove, "Approve failed")
        //     })

        //     it("use a regenerated session key with the same parameters", async () => {
        //         const sessionKeyParams: SessionKeyParams = {
        //             targetWhitelist: [outtokenAddr, basetokenAddr],
        //             actionWhitelist: [
        //                 {
        //                     abi: ERC20_ABI,
        //                     functionWhitelist: ["approve"]
        //                 }
        //             ],
        //             feeTokenWhitelist: [AddressZero],
        //             feeRecipientWhitelist: [feeRecip],
        //             deadline,
        //             ruleId: ruleId,
        //             roleId: roleId
        //         }
        //         const newuser = await createSessionUser({ privateKey: sessionKeyPrivateKey }, sessionKeyParams)

        //         const randomAddress = randomBytes(20)
        //         const walletAddress = await wallet.getAddress()
        //         const outTokenAddress = await new Token(outToken).getAddress()
        //         const randomApproveAmount = randInt(10000)
        //         const operation = await wallet.tokenApprove(newuser, await newuser.getAddress(), {
        //             spender: randomAddress,
        //             amount: randomApproveAmount,
        //             token: outTokenAddress
        //         })
        //         await wallet.executeOperation(user, operation)
        //         await new Promise((resolve) => {
        //             setTimeout(resolve, 5000)
        //         })
        //         const postApprove = await Token.getApproval(outToken, walletAddress, randomAddress)

        //         assert(BigInt(await new Token(outTokenAddress).getDecimalAmount(randomApproveAmount)) === postApprove, "Approve failed")
        //     })

        //     it("Session key function out of scope", async () => {
        //         it("Session key selector out of scope", async () => {
        //             const randomAddress = randomBytes(20)
        //             const outTokenAddress = await new Token(outToken).getAddress()
        //             try {
        //                 const operation = await wallet.transfer(user, await user.getAddress(), {
        //                     to: randomAddress,
        //                     amount: 1,
        //                     token: outTokenAddress
        //                 })
        //                 await wallet.executeOperation(user, operation)
        //                 assert(false, "call succeded when it should have failed")
        //             } catch (e: any) {
        //                 assert(e.message.includes("FW"))
        //             }
        //         })
        //     })

        //     it("Session key target out of scope", async () => {
        //         const randomAddress = randomBytes(20)
        //         let outTokenAddress: string
        //         if (config.chainId !== 8453) {
        //             outTokenAddress = await new Token("usdc").getAddress()
        //         } else {
        //             outTokenAddress = "0x434769c82fB928150B87C4Ae6320Bf71F92dCCa5"
        //         }
        //         try {
        //             const operation = await wallet.transfer(user, await user.getAddress(), {
        //                 to: randomAddress,
        //                 amount: 1,
        //                 token: outTokenAddress
        //             })
        //             await wallet.executeOperation(user, operation)
        //             assert(false, "call succeded when it should have failed")
        //         } catch (e: any) {
        //             assert(
        //                 e.message.includes("Function or target is not allowed in session key"),
        //                 "call succeded when it should have failed"
        //             )
        //         }
        //     })

        //     it("Session key expires", async () => {
        //         const diff = deadline * 1000 - Date.now()
        //         if (diff > 0n) {
        //             await new Promise((resolve) => setTimeout(resolve, Number(diff) * 1.2))
        //         }
        //         const randomAddress = randomBytes(20)
        //         const outTokenAddress = await new Token(outToken).getAddress()
        //         try {
        //             const operation = await wallet.tokenApprove(user, await user.getAddress(), {
        //                 spender: randomAddress,
        //                 amount: 1,
        //                 token: outTokenAddress
        //             })
        //             await wallet.executeOperation(user, operation)
        //             assert(false, "call succeded when it should have failed")
        //         } catch (e: any) {
        //             e
        //         }
        //     })
        // })
    })
}
