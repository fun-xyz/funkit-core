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
            await useFaucet(chain, wallet)
            const ethBalAfter = Number(await Token.getBalance("eth", await wallet.getAddress()))
            const daiBalAfter = Number(await Token.getBalance("dai", await wallet.getAddress()))
            const usdcBalAfter = Number(await Token.getBalance("usdc", await wallet.getAddress()))
            const usdtBalAfter = Number(await Token.getBalance("usdt", await wallet.getAddress()))
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
