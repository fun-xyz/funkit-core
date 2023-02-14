const { FunWalletConfig } = require("../utils/configs/walletConfigs")
const { EoaAaveWithdrawal, ApproveAndSwap, TransferToken } = require("../src/modules/index")
const { FunWallet } = require("../index")
const { execTest, transferAmt, getAddrBalanceErc, getBalance, transferErc, execContractFunc, getUserBalanceErc, createErc, } = require("../utils/deploy")

const ethers = require('ethers')

const mainTest = async (wallet, tokenAddr) => {
    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAXa
    const module = new EoaAaveWithdrawal()

    const txdata = await module.encodeInitCall()
    // console.log(await execContractFunc(wallet.eoa, { gasLimit: 1000000, ...txdata }))
    await wallet.addModule(module)

    const modulePreExecTxs = await module.getPreExecTxs(tokenAddr)

    await wallet.deployTxs(modulePreExecTxs)
    console.log("pre transaction status success: ", await module.verifyRequirements(tokenAddr))

    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    const aaveActionTx = await module.createWithdraw(tokenAddr)

    const withdrawReceipt = await wallet.deployTx(aaveActionTx)
    console.log("Execution Succesful:\n", withdrawReceipt)
}

const amount = 10;
const main = async (privKey, prefundAmt, APIKEY, rpcurl) => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const walletConfig = new FunWalletConfig(eoa, CHAIN, APIKEY, prefundAmt)
    const wallet = new FunWallet(walletConfig)
    const eoaATokenBalance = await getAddrBalanceErc(eoa, atokenAddr, eoa.address)
    await wallet.init()
    await mainTest(wallet, atokenAddr)
    const endEoaATokenBalance = await getAddrBalanceErc(eoa, atokenAddr, eoa.address)
    console.log("Withdrew: ", (eoaATokenBalance - endEoaATokenBalance), "tokens")

}

// const privKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const prefundAmt = 0.3
const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const aWETH = "0x9668f5f55f2712Dd2dfa316256609b516292D554" //fork token
// const aWETH = "0x2B2927e26b433D92fC598EE79Fa351d6591B8F95"

const atokenAddr = aWETH
// const CHAIN = 31337
// const rpcurl = "http://127.0.0.1:8545/"
const CHAIN = "43113"
const rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"

main(privKey, prefundAmt, APIKEY, rpcurl)
// processConsole()