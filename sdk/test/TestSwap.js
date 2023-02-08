const { FunWallet, AccessControlSchema } = require("../index")
const { ApproveAndSwap } = require("../modules")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const { TranslationServer } = require('../utils/TranslationServer')
const { execTest, transferAmt, getAddrBalanceErc, transferErc, getUserBalanceErc, } = require("../utils/deploy")

const ERC20 = require("../utils/abis/ERC20.json")


const routerAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const chain = "31337"
const rpcurl = "http://127.0.0.1:8545"

const prefundAmt = 0

const amount = 4

const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const getBalance = async (wallet) => {
    const balance = await wallet.provider.getBalance(wallet.address);
    return ethers.utils.formatUnits(balance, 18)
}

const logTest = (test) => {
    console.log("\n\n" + test + "\n\n")
}


const testERCPair = async (wallet, swapModule, eoa) => {
    logTest("ERC SWAP: USDC=>DAI")
    await transferErc(eoa, USDC, wallet.address, amount)

    let startWalletDAI = await getUserBalanceErc(wallet, DAI)

    const tx = await swapModule.createSwap(USDC, DAI, amount)
    const execReceipt = await wallet.deployTx(tx)

    let endWalletDAI = await getUserBalanceErc(wallet, DAI)

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    logPairing(amount, outDiff, "USDC", "DAI")
}



const testEthSwap = async (wallet, swapModule, eoa) => {
    logTest("ETH SWAP: ETH=>WETH=>DAI")
    // await transferAmt(eoa, wallet.address, amount)

    const startWalletDAI = await getUserBalanceErc(wallet, DAI)

    const tx = await swapModule.createSwap(DAI, amount)
    const execReceipt = await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, DAI)

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    logPairing(amount, outDiff, "ETH", "DAI")

}

const logPairing = (amount, outDiff, tok1, tok2) => {
    console.log(`${tok1}/${tok2} = ${outDiff / amount}`)

}



const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const funder = new ethers.Wallet(pkey, provider)

    const walletConfig = new FunWalletConfig(eoa, prefundAmt, chain, APIKEY)
    const wallet = new FunWallet(walletConfig)

    await wallet.init()



    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))

    console.log()


    const swapModule = new ApproveAndSwap(routerAddr)
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await testERCPair(wallet, swapModule, eoa)
    await testEthSwap(wallet, swapModule, eoa)
}


if (typeof require !== 'undefined' && require.main === module) {
    main()
}

    // const preDeploy = await wallet.contracts[wallet.address].callMethod("getModuleStateVal", [swapModule.actionAddr])
    // const postDeploy = await wallet.contracts[wallet.address].callMethod("getModuleStateVal", [swapModule.actionAddr])
    // console.log(preDeploy)
    // console.log(postDeploy)
