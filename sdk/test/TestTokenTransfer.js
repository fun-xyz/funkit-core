const { FunWallet, TransferToken, AccessControlSchema } = require("../index")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const chain = '43113' //avax fuji 
// const chain = 31337 // hardhat 
const { DataServer } = require('../utils/DataServer')

const { getUserBalanceErc } = require("../utils/deploy")
const oneE18=ethers.constants.WeiPerEther
const main = async (tokenAddr, privKey, prefundAmt, APIKEY, rpcurl) => {

    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const bal = await provider.getBalance(eoa.address)
    const orgName=""

    const to = '0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e'
    const amount = 1000000

    const config = new FunWalletConfig(eoa,chain, APIKEY, prefundAmt)
    const wallet = new FunWallet(config)
    await wallet.init()

    const transfer = new TransferToken() 
    await wallet.addModule(transfer)

    const {address} = await wallet.deploy()

    console.log("Fun Wallet Address: ", address)
    const start = await getUserBalanceErc(wallet, tokenAddr)

    const transferActionTx = await transfer.createTransfer(to, amount, tokenAddr, wallet)
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Tokens Spent: ", start - end, start, end)
}

const processConsole = () => {
    const [tokenAddr, privKey, prefundAmt, APIKEY, rpcurl] = process.argv.slice(2)
    main(tokenAddr, privKey, parseFloat(prefundAmt), APIKEY, rpcurl)
}


processConsole()




