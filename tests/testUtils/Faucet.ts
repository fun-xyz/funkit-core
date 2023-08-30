import { expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
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

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId()
            })
        })

        it("Test Faucet - Should get USDC, DAI, USDT", async () => {
            const chain = await Chain.getChain({ chainIdentifier: config.chainId })
            const ethBalBefore = Number(await Token.getBalance("eth", await wallet.getAddress()))
            const daiBalBefore = Number(await Token.getBalance("dai", await wallet.getAddress()))
            const usdcBalBefore = Number(await Token.getBalance("usdc", await wallet.getAddress()))
            const usdtBalBefore = Number(await Token.getBalance("usdt", await wallet.getAddress()))

            console.log(await useFaucet(chain, wallet))
            await new Promise((r) => setTimeout(r, 30_000))
            expect(Number(await Token.getBalance("eth", await wallet.getAddress()))).to.be.greaterThan(ethBalBefore)
            expect(Number(await Token.getBalance("dai", await wallet.getAddress()))).to.be.greaterThan(daiBalBefore)
            expect(Number(await Token.getBalance("usdc", await wallet.getAddress()))).to.be.greaterThan(usdcBalBefore)
            expect(Number(await Token.getBalance("usdt", await wallet.getAddress()))).to.be.greaterThan(usdtBalBefore)
        })
    })
}
