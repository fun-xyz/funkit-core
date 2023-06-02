import { assert } from "chai"
import { Wallet } from "ethers"
import { Auth, Eoa } from "../../src/auth"
import { Token } from "../../src/data"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../testUtils"

export interface TransferTestConfig {
    chainId: number
    authPrivateKey: string
    outToken: string
    baseToken: string
    prefund: boolean
    index?: number
    amount?: number
}

export const TransferTest = (config: TransferTestConfig) => {
    const { chainId, authPrivateKey, outToken, baseToken, prefund } = config

    describe("Transfer", function () {
        this.timeout(120_000)
        let auth: Auth
        let wallet: FunWallet
        let difference: number
        before(async function () {
            let apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId.toString(),
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.index != null ? config.index : 1792811340 })

            if (prefund) await fundWallet(auth, wallet, 0.7)
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(outToken, walletAddress)
            await wallet.swap(auth, {
                in: baseToken,
                amount: config.amount ? config.amount : 0.01,
                out: outToken
            })
            const tokenBalanceAfter = await Token.getBalance(outToken, walletAddress)
            difference = Number(tokenBalanceAfter) - Number(tokenBalanceBefore)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("transfer baseToken directly", async () => {
            var wallet1 = Wallet.createRandom()
            const randomAddress = wallet1.address
            const walletAddress = await wallet.getAddress()

            let b1 = Token.getBalance(baseToken, randomAddress)
            let b2 = Token.getBalance(baseToken, walletAddress)
            await wallet.transfer(auth, { to: randomAddress, amount: config.amount ? config.amount : 0.01, token: baseToken })
            let b3 = Token.getBalance(baseToken, randomAddress)
            let b4 = Token.getBalance(baseToken, walletAddress)

            let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([
                b1,
                b2,
                b3,
                b4
            ])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        it("wallet should have lower balance of specified token", async () => {
            var wallet1 = Wallet.createRandom()
            const randomAddress = wallet1.address
            const walletAddress = await wallet.getAddress()

            let b1 = Token.getBalance(outToken, randomAddress)
            let b2 = Token.getBalance(outToken, walletAddress)
            await wallet.transfer(auth, { to: randomAddress, amount: Math.floor(difference / 2), token: outToken })
            let b3 = Token.getBalance(outToken, randomAddress)
            let b4 = Token.getBalance(outToken, walletAddress)

            let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([
                b1,
                b2,
                b3,
                b4
            ])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })
    })
}
