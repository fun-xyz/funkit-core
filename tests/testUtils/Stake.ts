import { assert } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { Token } from "../../src/data"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../testUtils"
import { BigNumber } from "ethers"
export interface StakeTestConfig {
    chainId: number
    authPrivateKey: string
    baseToken: string
    prefund: boolean
    steth: string
}

export const StakeTest = (config: StakeTestConfig) => {
    const { chainId, authPrivateKey, baseToken, prefund } = config

    describe("Stake", function () {
        this.timeout(120_000)
        let auth: Auth
        let wallet: FunWallet
        before(async function () {
            let apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId.toString(),
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
            if (prefund) await fundWallet(auth, wallet, 0.002)
        })

        it.skip("wallet should have lower balance of gas token", async () => {
            const walletAddress = await wallet.getAddress()
            const balBefore = await Token.getBalance(baseToken, walletAddress)
            await wallet.stake(auth, { amount: BigNumber.from(10).pow(15) })
            const balAfter = await Token.getBalance(baseToken, walletAddress)
            assert(balAfter < balBefore, "unable to stake")
        })

        it("Should be able to start unstaking", async () => {
            await wallet.requestUnstake(auth, { amount: .001 })
        })

        it.skip("Should be able to finish unstaking if ready", async () => {
            await wallet.finishUnstake(auth, {})
        })
    })
}
