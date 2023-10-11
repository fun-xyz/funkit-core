import { expect } from "chai"
import { Auth } from "../../src/auth"
import { TurnkeyAuth } from "../../src/auth/TurnkeyAuth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
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
    const { baseToken, prefundAmt, amount } = config

    describe("Turnkey Passkeys", function () {
        this.timeout(300_000)
        let auth: Auth
        let funder: Auth
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
        })

        it("Create Auth", async () => {
            auth = new TurnkeyAuth("localhost")
            funder = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1992811349)
            })
            console.log("wallet", await wallet.getAddress())
            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(funder, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < prefundAmt) {
                await fundWallet(funder, wallet, prefundAmt ? prefundAmt : 0.2)
            }
        })

        it("Execute User Operation with wallet", async () => {
            const funderAddress = await funder.getAddress()
            const walletAddress = await wallet.getAddress()
            const ethTransferAmount = amount ? amount : 0.00001

            const beforeFunderBalance = Number(await Token.getBalanceBN(baseToken, funderAddress))
            const beforeWalletBalance = Number(await Token.getBalanceBN(baseToken, walletAddress))
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: await funder.getAddress(),
                amount: ethTransferAmount,
                token: "eth"
            })
            expect(await wallet.executeOperation(auth, userOp)).to.not.throw
            const afterFunderBalance = Number(await Token.getBalanceBN(baseToken, funderAddress))
            const afterWalletBalance = Number(await Token.getBalanceBN(baseToken, walletAddress))
            expect(afterFunderBalance).to.equal(beforeFunderBalance + ethTransferAmount)
            expect(afterWalletBalance).to.be.lt(beforeWalletBalance)
        })
    })
}
