import { assert } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface TransferTestConfig {
    chainId: number
    outToken: string
    baseToken: string
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
        })

        it("transfer baseToken directly", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()
            const b1 = Token.getBalanceBN(baseToken, randomAddress)
            const b2 = Token.getBalanceBN(baseToken, walletAddress)
            await wallet.transferEth(auth, { to: randomAddress, amount: config.amount ? config.amount : 0.001 })
            const b3 = Token.getBalanceBN(baseToken, randomAddress)
            const b4 = Token.getBalanceBN(baseToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })

        it("wallet should have lower balance of specified token", async () => {
            const randomAddress = randomBytes(20)
            const walletAddress = await wallet.getAddress()
            if (config.chainId === 5) {
                const chain = await getChainFromData(config.chainId)
                const outTokenAddress = await Token.getAddress(outToken)

                const outTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionData(outTokenAddress, "mint", [
                    await wallet.getAddress(),
                    1000000000000000000000n
                ])
                await chain.init()
                outTokenMint.chain = chain
                await auth.sendTx(outTokenMint)
            }

            const b1 = Token.getBalanceBN(outToken, randomAddress)
            const b2 = Token.getBalanceBN(outToken, walletAddress)
            const outTokenAddress = await new Token(outToken).getAddress()
            await wallet.transferERC20(auth, { to: randomAddress, amount: 1, token: outTokenAddress })
            const b3 = Token.getBalanceBN(outToken, randomAddress)
            const b4 = Token.getBalanceBN(outToken, walletAddress)

            const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
                await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
        })
    })
}
