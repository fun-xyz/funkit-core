const { FunWallet, TransferToken, AccessControlSchema } = require("../index")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
// const chain = '43113' //avax fuji 
const chain = 31337 // hardhat 
const { DataServer } = require('../utils/DataServer')

const { getUserBalanceErc } = require("../utils/deploy")
const oneE18=ethers.constants.WeiPerEther
const rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const main = async (privKey, prefundAmt, APIKEY) => {


    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const bal = await provider.getBalance(eoa.address)


    const to = '0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e'
    const amount = oneE18
    const tokenName = "cvt"

    const config = new FunWalletConfig(eoa, prefundAmt, chain, APIKEY)
    const wallet = new FunWallet(config)
    await wallet.init()

    const transfer = new TransferToken() //0x5425890298aed601595a70AB815c96711a31Bc65 //token address
    await wallet.addModule(transfer)
    const {address} = await wallet.deploy()
    console.log("Fun Wallet Address: ", address)
    const start = await getUserBalanceErc(wallet, "0x52173b6ac069619c206b9A0e75609fC92860AB2A")

    const transferActionTx = await transfer.createTransfer(to, amount, "usdc")
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, "0x52173b6ac069619c206b9A0e75609fC92860AB2A")
    console.log("Tokens Spent: ", start - end)
}

const processConsole = () => {
    const [privKey, prefundAmt, APIKEY] = process.argv.slice(3)
    main(privKey, parseFloat(prefundAmt), APIKEY)
}


processConsole()




