import { assert } from "chai"
import { Address } from "viem"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface TransferTestConfig {
    chainId: number
    outToken: Address
    baseToken: Address
    prefund: boolean
    index?: number
    amount?: number
    prefundAmt?: number
    numRetry?: number
}

export const TransferTest = (config: TransferTestConfig) => {
    const { outToken, baseToken, prefund, prefundAmt } = config

    describe("Transfer", function () {
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        let difference: number
        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.index ? config.index : 1792811340 })
            if (prefund) await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 1)
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(outToken, walletAddress)
            await wallet.uniswapV3Swap(auth, {
                in: config.baseToken,
                amount: config.amount ? config.amount : 0.0001,
                out: config.outToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            const tokenBalanceAfter = await Token.getBalance(outToken, walletAddress)
            difference = Number(tokenBalanceAfter) - Number(tokenBalanceBefore)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("transfer baseToken directly", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(baseToken, randomAddress)
            const b2 = Token.getBalance(baseToken, walletAddress)
            await wallet.transferEth(auth, { to: randomAddress, amount: config.amount ? config.amount : 0.001 })
            const b3 = Token.getBalance(baseToken, randomAddress)
            const b4 = Token.getBalance(baseToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        it("wallet should have lower balance of specified token", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()

            const b1 = Token.getBalance(outToken, randomAddress)
            const b2 = Token.getBalance(outToken, walletAddress)
            await wallet.transferERC20(auth, { to: randomAddress, amount: Math.floor(difference / 2), token: outToken })
            const b3 = Token.getBalance(outToken, randomAddress)
            const b4 = Token.getBalance(outToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })
    })
}
