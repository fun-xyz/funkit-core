import { expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { FunKit } from "../../src/FunKit"
import { useFaucet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface FaucetTestConfig {
    chainId: number
    numRetry: number
}

export const FaucetTest = (config: FaucetTestConfig) => {
    describe("Faucet Test", function () {
        this.timeout(300_000)
        let auth: Auth
        let wallet: FunWallet

        let fun: FunKit

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, 1992811349)
        })

        it("Test Faucet - Should get USDC, DAI, USDT", async () => {
            const chain = wallet.getChain()

            const ethTokenObj = wallet.getToken("eth")
            const daiTokenObj = wallet.getToken("dai")
            const usdcTokenObj = wallet.getToken("usdc")
            const usdtTokenObj = wallet.getToken("usdt")

            const ethBalBefore = Number(await ethTokenObj.getBalance())
            const daiBalBefore = Number(await daiTokenObj.getBalance())
            const usdcBalBefore = Number(await usdcTokenObj.getBalance())
            const usdtBalBefore = Number(await usdtTokenObj.getBalance())

            await useFaucet(chain, wallet)

            const ethBalAfter = Number(await ethTokenObj.getBalance())
            const daiBalAfter = Number(await daiTokenObj.getBalance())
            const usdcBalAfter = Number(await usdcTokenObj.getBalance())
            const usdtBalAfter = Number(await usdtTokenObj.getBalance())

            expect(ethBalAfter).to.be.greaterThan(ethBalBefore)
            expect(daiBalAfter).to.be.greaterThan(daiBalBefore)
            expect(usdcBalAfter).to.be.greaterThan(usdcBalBefore)
            expect(usdtBalAfter).to.be.greaterThan(usdtBalBefore)

            await wallet.transfer(auth, await auth.getUserId(), {
                token: "eth",
                amount: 0.1,
                to: "0x74208cB89aEC8B44522c747CA30Ed1dc5FeA461a"
            })
        })
    })
}
