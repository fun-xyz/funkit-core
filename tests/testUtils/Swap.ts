import { assert } from "chai"
import { Hex } from "viem"
import { SessionKeyParams, createSessionUser } from "../../src/actions"
import { Eoa } from "../../src/auth"
import { APPROVE_AND_SWAP_ABI, ERC20_CONTRACT_INTERFACE } from "../../src/common"
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
    prefundAmt?: number
    mint?: boolean
    slippage?: number
    numRetry?: number
}

export const SwapTest = (config: SwapTestConfig) => {
    const { inToken, outToken, baseToken, prefund, amount, prefundAmt } = config
    const mint = Object.values(config).includes("mint") ? true : config.mint
    describe("Swap", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(200_000)
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
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: config.index ? config.index : 17928113400 })
            if (prefund) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (mint) {
                const chain = await getChainFromData(options.chain)
                await chain.init()
                const inTokenAddress = await Token.getAddress(inToken, options)
                const decAmount = await Token.getDecimalAmount(inTokenAddress, amount ? amount : 19000000, options)
                const data = ERC20_CONTRACT_INTERFACE.encodeTransactionData(inTokenAddress, "mint", [await wallet.getAddress(), decAmount])
                data.chain = chain
                await auth.sendTx(data)
                const wethAddr = await Token.getAddress("weth", options)
                await wallet.transferEth(auth, { to: wethAddr, amount: 0.002 })
            }
        })

        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)

            await wallet.uniswapV3Swap(auth, {
                in: baseToken,
                amount: config.amount ? config.amount : 0.001,
                out: inToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })

            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            await wallet.uniswapV3Swap(auth, {
                in: inToken,
                amount: 1, //Number((erc20Delta / 2).toFixed(3)),
                out: outToken,
                slippage: config.slippage ? config.slippage : 0.5,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
        })

        it("ERC20 => ETH", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
            await wallet.uniswapV3Swap(auth, {
                in: inToken,
                amount: 1,
                out: baseToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
            assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
        })

        describe("With Session Key", () => {
            const user = createSessionUser()
            before(async () => {
                const second = 1000
                const minute = 60 * second
                const chain = await getChainFromData(config.chainId)
                const deadline = BigInt(Date.now() + 2 * minute)
                const targetAddr = await chain.getAddress("tokenSwapAddress")
                const sessionKeyParams: SessionKeyParams = {
                    user,
                    targetWhitelist: [targetAddr],
                    actionWhitelist: [
                        {
                            abi: APPROVE_AND_SWAP_ABI,
                            functionWhitelist: ["executeSwapETH", "executeSwapERC20"]
                        }
                    ],
                    deadline,
                    chainId: config.chainId
                }

                await wallet.createSessionKey(auth, sessionKeyParams)
            })

            it("ETH => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)

                await wallet.uniswapV3Swap(user, {
                    in: baseToken,
                    amount: config.amount ? config.amount : 0.001,
                    out: inToken,
                    returnAddress: walletAddress,
                    chainId: config.chainId
                })

                const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            })

            it("ERC20 => ERC20", async () => {
                const walletAddress = await wallet.getAddress()
                const tokenBalanceBefore = await Token.getBalance(inToken, walletAddress)
                await wallet.uniswapV3Swap(user, {
                    in: inToken,
                    amount: 1, //Number((erc20Delta / 2).toFixed(3)),
                    out: outToken,
                    slippage: config.slippage ? config.slippage : 0.5,
                    returnAddress: walletAddress,
                    chainId: config.chainId
                })
                const tokenBalanceAfter = await Token.getBalance(inToken, walletAddress)
                assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")
            })
        })
    })
}
