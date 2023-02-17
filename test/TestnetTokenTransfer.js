const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")
const ethers = require('ethers')
let { transferAmt, getAddrBalanceErc, getBalance, getUserBalanceErc, logPairing, HARDHAT_FORK_CHAIN_ID,
     PRIV_KEY,  DAI_ADDR, API_KEY } = require("./TestUtils")
const { Token } = require("../utils/Token")
const TokenTypes = require('../utils/Token')
const PREFUND_AMT = 0
const RPC_URL = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const CHAIN_ID = "43113"
const USDC_AVAX_ADDR = "0x5425890298aed601595a70AB815c96711a31Bc65"
const PKEY='3ef076e7d3d2e1f65ded46b02372d7c5300aec49e780b3bb4418820bf068e732'

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log(`funWallet ${wallet.address} starting ERC20:(USDC) balance: `, start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransfer(to, amount, {type:TokenTypes.ERC20, address:tokenAddr})
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
    console.log("Difference: ", start - end)
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const sender = new ethers.Wallet(PRIV_KEY, provider)
    const receiver = new ethers.Wallet(PKEY, provider)

    const walletConfig = new FunWalletConfig(sender, CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()

    // await wallet.deploy()

    console.log("sender address", sender.address)
    console.log("receiver address", receiver.address)
    console.log("wallet avax balance: ", await getBalance(wallet))
    console.log("sender avax balance: ", await getBalance(sender))
    console.log("receiver avax balance: ", await getBalance(receiver))

    const funderWalletErc20BalanceStart = await getAddrBalanceErc(sender, USDC_AVAX_ADDR, receiver.address)
    console.log("receiver starting ERC20:(USDC) balance: ", funderWalletErc20BalanceStart)
    await walletTransferERC(wallet, receiver.address, "1000000", USDC_AVAX_ADDR) //1000000 = 1usdc
    const funderWalletErc20BalanceEnd = await getAddrBalanceErc(sender, USDC_AVAX_ADDR, receiver.address)
    console.log("receiver ending ERC20:(USDC) balance: ", funderWalletErc20BalanceEnd)
    console.log("receiver ERC20:(USDC) Difference: ", funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart)
}

if (typeof require !== 'undefined' && require.main === module) {
    main()
}