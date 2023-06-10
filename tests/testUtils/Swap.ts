import { assert } from "chai"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"

export interface SwapTestConfig {
    chainId: number
    inToken: string
    outToken: string
    baseToken: string
    prefund: boolean
    amount?: number
    index?: number
}

export const SwapTest = (config: SwapTestConfig) => {
    const { inToken, outToken, baseToken, prefund } = config

    describe("Swap", function () {
        this.timeout(120_000)
        let auth: Eoa
        let wallet: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId.toString(),
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.index ? config.index : 1792811340 })

            if (prefund) {
                await fundWallet(auth, wallet, config.amount ? config.amount : 0.005)
            }
        })
        let difference: number
        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            await wallet.swap(auth, {
                in: baseToken,
                amount: config.amount ? config.amount : 0.001,
                out: inToken
            })
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            difference = Number(tokenBalanceAfter) - Number(tokenBalanceBefore)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(outToken, walletAddress)
            await wallet.swap(auth, {
                in: inToken,
                amount: Math.floor(difference / 2),
                out: outToken
            })
            const tokenBalanceAfter = await Token.getBalance(outToken, walletAddress)
            assert(Number(tokenBalanceAfter) > Number(tokenBalanceBefore), "Swap did not execute")
        })
    })
}
