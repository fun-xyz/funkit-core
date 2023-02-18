const { FunWallet, FunWalletConfig } = require("../index")

const { TokenSwap } = require('../index').Modules
const ethers = require('ethers')
const { HARDHAT_FORK_CHAIN_ID, RPC_URL, ROUTER_ADDR, PRIV_KEY, PKEY, } = require("./TestUtils")

const PREFUND_AMT = 0
const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PKEY, provider)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, eoa.address)
    const wallet = new FunWallet(walletConfig, APIKEY)
    await wallet.init()

    const swapModule = new TokenSwap()
    const moduleAddr = require("./testConfig.json").approveAndSwapAddress
    await swapModule.init(31337)

    await wallet.addModule(swapModule)
    await wallet.deploy()

}

if (typeof require !== 'undefined' && require.main === module) {
    main()
}