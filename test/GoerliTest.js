const { FunWallet, FunWalletConfig } = require("../index")
const { expect } = require("chai")
const ethers = require('ethers')
const { FunWallet, FunWalletConfig, Modules } = require('../index')
const ethers = require('ethers')
describe("Test on Goerli", function() {
    let eoa
    before(async function() {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PKEY, provider)
    })

    it("FunWalletFactory", async function() {
        this.timeout(30000)
        const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, 0.3)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const walletConfig1 = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, 0)
        const wallet1 = new FunWallet(walletConfig1, TEST_API_KEY)
        await wallet1.init()
        
        expect(wallet.address).to.be.equal(wallet1.address)
    })
    it("Transfer USDC", async function(){
        this.timeout(30000)

    })
})

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new Modules.TokenTransfer()
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
    // console.log(transferActionTx);
    const receipt = await wallet.deployTx(transferActionTx)
    console.log(receipt)
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider("https://goerli.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7")
    eoa = new ethers.Wallet("6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064", provider)
    //8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38
    // console.log(eoa)
    const config = new FunWalletConfig(eoa, "0x175C5611402815Eba550Dad16abd2ac366a63329", "5", 0);
    const wallet = new FunWallet(config, "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf");
    await wallet.init()

    console.log(wallet.address)
    await walletTransferERC(wallet, "0xDc054C4C5052F0F0c28AA8042BB333842160AEA2", "100", "0x07865c6E87B9F70255377e024ace6630C1Eaa37F") //1000000 = 1usdc

    const transfer = new Modules.TokenTransfer()
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
    // console.log(transferActionTx);
    const receipt = await wallet.deployTx(transferActionTx)
    console.log(receipt)

}
main()






