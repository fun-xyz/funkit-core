const {FunWallet, FunWalletConfig, Modules} = require('../index')
const ethers = require('ethers')
const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new Modules.TokenTransfer()
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
    // console.log(transferActionTx);
    const receipt = await wallet.deployTx(transferActionTx)
    console.log(receipt)
  }
const main =async ()=>{
    const provider = new ethers.providers.JsonRpcProvider("https://goerli.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7")
    eoa = new ethers.Wallet("6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064", provider)
    //8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38
    // console.log(eoa)
    const config = new FunWalletConfig(eoa, "0x175C5611402815Eba550Dad16abd2ac366a63329", "5", 0);
    const wallet = new FunWallet(config, "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf");
    await wallet.init()
    
    console.log(wallet.address)

    await walletTransferERC(wallet, "0xDc054C4C5052F0F0c28AA8042BB333842160AEA2", "100", "0x07865c6E87B9F70255377e024ace6630C1Eaa37F") //1000000 = 1usdc
}
main()



// const {FunWallet, FunWalletConfig, Modules} = require('../index')
// const ethers = require('ethers')
// const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
//     const transfer = new Modules.TokenTransfer()
//     await wallet.addModule(transfer)
//     const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
//     // console.log(transferActionTx);
//     const receipt = await wallet.deployTx(transferActionTx)
//     console.log(receipt)
//   }
// const mainAvax =async ()=>{
//     const provider = new ethers.providers.JsonRpcProvider("https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7")
//     eoa = new ethers.Wallet("66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206", provider)
    
//     console.log(eoa)
//     const config = new FunWalletConfig(eoa, "0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e", "43113", 0.2);
//     const wallet = new FunWallet(config, "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf");
//     await wallet.init()
    
//     console.log(wallet.address)

//     await walletTransferERC(wallet, "0xDc054C4C5052F0F0c28AA8042BB333842160AEA2", "100", "0x5425890298aed601595a70AB815c96711a31Bc65") //1000000 = 1usdc
// }
// mainAvax()




// // curl https://eth-mainnet.g.alchemy.com/v2/demo \
// // -X POST \
// // -H "Content-Type: application/json" \
// // --data '{"method":"debug_traceCall","params":[{"from":null,"to":"0x6b175474e89094c44da98b954eedeac495271d0f","data":"0x70a082310000000000000000000000006E0d01A76C3Cf4288372a29124A26D4353EE51BE"}, "latest"],"id":1,"jsonrpc":"2.0"}'



// // const ethers = require('ethers');
// // let mnemonic = "cheap hold fence unique valve profit aware catalog whale fetch expect rug";
// // let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
// // console.log(mnemonicWallet.privateKey);
// // // console.log(mnemonicWallet.publicKey);
