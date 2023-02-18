const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap } = require('../index').Modules
const ethers = require('ethers')
const { HARDHAT_FORK_CHAIN_ID, RPC_URL, PKEY, API_KEY } = require("./TestUtils")

const main = async (amt = 0) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PKEY, provider)

    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, amt)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()

    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()
}

if (typeof require !== 'undefined' && require.main === module) {
    console.log("\n\n::::::FACTORY TEST::::::")
    main(0.3).then(main)
}