const { FunWallet, FunWalletConfig } = require("../index")

const { ApproveAndSwap } = require('../index').Modules
const ethers = require('ethers')
const { HARDHAT_FORK_CHAIN_ID, RPC_URL, ROUTER_ADDR, PRIV_KEY, PKEY, } = require("./TestUtils")

const PREFUND_AMT = 0
const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, eoa.address)
    const wallet = new FunWallet(walletConfig, APIKEY)
    await wallet.init()

    const swapModule = new ApproveAndSwap()
    const moduleAddr = require("./testConfig.json").approveAndSwapAddress
    await swapModule.init(ROUTER_ADDR, moduleAddr)

    await wallet.addModule(swapModule)
    await wallet.deploy()

}

if (typeof require !== 'undefined' && require.main === module) {
    main()
}