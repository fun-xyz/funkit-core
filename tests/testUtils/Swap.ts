import { assert } from "chai"
import { Hex } from "viem"
import { Eoa } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

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
    const { inToken, outToken, baseToken, prefund, amount } = config

    describe("Swap", function () {
        this.timeout(120_000)
        let auth: Eoa
        let wallet: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.index ? config.index : 1792811340 })
            if (prefund) {
                await fundWallet(auth, wallet, 0.2)
            }

            const chain = await getChainFromData(options.chain)
            if ((await chain.getChainId()) !== "5") {
                const inTokenAddress = await Token.getAddress(inToken, options)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionData(inTokenAddress, "mint", [await wallet.getAddress(), amount])
                data.chain = chain
                await auth.sendTx(data)
            }
            const wethAddr = await Token.getAddress("weth", options)
            await wallet.transfer(auth, { to: wethAddr, amount: 0.002 })
        })

        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            await wallet.swap(auth, {
                in: baseToken,
                amount: 0.001,
                out: inToken
            })
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            await wallet.swap(auth, {
                in: inToken,
                amount: 0.001,
                out: outToken
            })
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
        })

        it("ERC20 => ETH", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            await wallet.swap(auth, {
                in: inToken,
                amount: 100,
                out: baseToken
            })
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
        })
    })
}
