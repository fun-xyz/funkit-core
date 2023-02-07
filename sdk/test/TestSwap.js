const { FunWallet, AccessControlSchema } = require("../index")
const { ApproveAndSwap } = require("../modules")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const { TranslationServer } = require('../utils/TranslationServer')
const { execTest, transferAmt, getAddrBalanceErc, transferErc, getUserBalanceErc, } = require("../utils/deploy")

const ERC20 = require("../utils/abis/ERC20.json")


const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDT = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"
const routerAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const chain = "31337"
const rpcurl = "http://127.0.0.1:8545"
const prefundAmt = 0.3
const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const walletConfig = new FunWalletConfig(eoa, prefundAmt, chain, APIKEY)
    const wallet = new FunWallet(walletConfig)
    await wallet.init()

    // console.log(wallet.address)

    const amount = 4

    const USDCToken = new ethers.Contract(USDC, ERC20.abi, provider)

    // await transferErc(eoa, USDC, wallet.address, amount)

    // const poolUSDCBalance = await getAddrBalanceErc(wallet.provider, USDC, "0xa63b490aA077f541c9d64bFc1Cc0db2a752157b5")
    // const poolDAIBalance = await getAddrBalanceErc(wallet.provider, DAI, "0xa63b490aA077f541c9d64bFc1Cc0db2a752157b5")

    // console.log("poolUSDCBalance: ", poolUSDCBalance)
    // console.log("poolDAIBalance: ", poolDAIBalance)

    let startWalletUSDC = await getUserBalanceErc(wallet, USDC)
    let startWalletDAI = await getUserBalanceErc(wallet, DAI)

    const swapModule = new ApproveAndSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()


    const tx = await swapModule.createExecution(routerAddr, USDC, DAI, amount)
    const execReceipt = await wallet.deployTx(tx, APIKEY)

    let endWalletUSDC = await getUserBalanceErc(wallet, USDC)
    let endWalletDAI = await getUserBalanceErc(wallet, DAI)

    console.log("USDC diff: ", Math.abs(parseFloat(startWalletUSDC) - parseFloat(endWalletUSDC)))
    console.log("Start USDC: ", parseFloat(startWalletUSDC), parseFloat(endWalletUSDC), "\n")
    console.log("DAI diff: ", Math.abs(parseFloat(endWalletDAI) - parseFloat(startWalletDAI)))
    console.log("Start DAI: ", parseFloat(startWalletDAI), parseFloat(endWalletDAI), "\n")
    const allowance = await USDCToken.allowance(wallet.address, routerAddr)
    console.log(allowance)

}



if (typeof require !== 'undefined' && require.main === module) {
    main()
}

    // const preDeploy = await wallet.contracts[wallet.address].callMethod("getModuleStateVal", [swapModule.actionAddr])
    // const postDeploy = await wallet.contracts[wallet.address].callMethod("getModuleStateVal", [swapModule.actionAddr])
    // console.log(preDeploy)
    // console.log(postDeploy)
