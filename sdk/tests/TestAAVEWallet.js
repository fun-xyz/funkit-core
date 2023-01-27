const { FunWallet, AAVEWithdrawal, AccessControlSchema, wallets } = require("../index")

const { AAVEWallet } = wallets
const ethers = require('ethers')

const assetAddr = "0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3" // Avax aave dai not adai
const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"

const main = async (aTokenAddress, privKey, prefundAmt, APIKEY) => {

    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const eoa = new ethers.Wallet(privKey, provider)

    const schema = new AccessControlSchema()
    const withdrawEntirePosition = schema.addAction(AAVEWithdrawal(aTokenAddress))
    // Add the withdraw from aave action to the FunWallet

    // Create a new FunWallet instance, 
    const chain = '43113'
    // Initialize the FunWallet instance, initially funded with 0.3 AVAX to cover gas fees
    const wallet = new FunWallet(eoa, schema, prefundAmt, chain, "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf")

    // Deploy the FunWallet
    const deployWalletReceipt = await wallet.deploy()

    const aaveWallet = new AAVEWallet(eoa, schema, prefundAmt, chain, APIKEY)

    const create = await aaveWallet.createSupply(assetAddr)
    const receipt1 = await FunWallet.deployActionTx(create)
    console.log(receipt1)

    const exec = await aaveWallet.execSupply(assetAddr)
    const receipt2 = await FunWallet.deployActionTx(exec)
    console.log(receipt2)
}

const processConsole = () => {
    main(process.argv[2], process.argv[3], process.argv[4], process.argv[5])
}


processConsole()