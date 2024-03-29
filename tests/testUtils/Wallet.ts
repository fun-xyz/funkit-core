import { expect } from "chai"
import { Wallet } from "../../src/apis"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { FunKit } from "../../src/FunKit"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface WalletTestConfig {
    chainId: number
}

export const WalletTest = (config: WalletTestConfig) => {
    const { chainId } = config
    describe("funWallet", function () {
        let auth: Auth
        let fun: FunKit

        this.timeout(400_000)

        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
        })

        it("Wallet.SaveToAuth should not error", async () => {
            const RandomNonce = Math.floor(Math.random() * 10000000000000)
            const uniqueId = await auth.getWalletUniqueId(RandomNonce)
            const funwallet = await fun.createWalletWithUsersAndId([{ userId: await auth.getAddress() }], uniqueId)

            expect(funwallet.saveWalletToAuth(auth)).to.not.throw
        })

        it("Wallet.SaveToAuth auth should display new wallet", async () => {
            const RandomNonce = Math.floor(Math.random() * 10000000000000)
            const uniqueId = await auth.getWalletUniqueId(RandomNonce)
            const funwallet = await fun.createWalletWithUsersAndId([{ userId: await auth.getAddress() }], uniqueId)
            const account = await funwallet.getAddress()
            await funwallet.saveWalletToAuth(auth)
            const authWallets = await auth.getWallets()

            expect(authWallets.find((wallet: Wallet) => wallet.walletAddr === account)).to.not.be.undefined
        })
    })
}
