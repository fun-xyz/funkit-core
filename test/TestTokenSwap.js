const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, getBalance, getUserBalanceErc, logPairing, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY } = require("./TestUtils")
const { Token, TokenTypes } = require("../utils/Token")

const PREFUND_AMT = 0.3
const AMOUNT = 60

const testEthSwap = async (wallet, swapModule, eoa) => {
    console.log("ETH SWAP: ETH=>WETH=>DAI")
    await transferAmt(eoa, wallet.address, AMOUNT)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const DAI = await Token.createToken({type: TokenTypes.ERC20, address: DAI_ADDR})
    const startWalletDAI = await getUserBalanceErc(wallet, DAI.address)

    const tokenIn = {type: TokenTypes.ETH, symbol :"weth", chainId: HARDHAT_FORK_CHAIN_ID}
    const tokenOut = {type: TokenTypes.ERC20, address: DAI.address}
    const tx = await swapModule.createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
    await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, DAI.address)
    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
    logPairing(AMOUNT, outDiff, "ETH", "DAI")
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const funder = new ethers.Wallet(PKEY, provider)

    await transferAmt(funder, eoa.address, AMOUNT + 1)

    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, "", 0)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()

    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))

    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await testEthSwap(wallet, swapModule, eoa)
}

if (typeof require !== 'undefined' && require.main === module) {
    main()
}