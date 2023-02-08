const { FunWallet, AccessControlSchema } = require("../index")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")

const { swapExec } = require('../utils/SwapUtils');


const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const DAI_MAINNET = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDT_MAINNET = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

const chain = "31337"

const call = {
    data: '0x414bf389000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000006e3bac25d3da425f3148dd7a23aa14c68036f0db0000000000000000000000000000000000000000000000000000000063e1afa300000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000d25bf22cf97a8a40000000000000000000000000000000000000000000000000000000000000000',
    to: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    value: '0x00'
}

const main = async (config, rpcurl) => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(config.privKey, provider)

    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAXa
    const walletConfig = new FunWalletConfig(eoa, config.prefundAmt, chain, config.APIKEY)
    const wallet = new FunWallet(walletConfig)

    await wallet.deploy()
    const swapCall = await swapExec(wallet.provider, SWAP_ROUTER_ADDRESS, USDC_MAINNET, DAI_MAINNET, 1, wallet.address)
    const tx = await wallet.createAction(swapCall)
    await wallet.deployTx(tx, config.APIKEY)
}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]

    prefundAmt = parseFloat(prefundAmt)
    rpcurl = "http://127.0.0.1:8545/"
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()




