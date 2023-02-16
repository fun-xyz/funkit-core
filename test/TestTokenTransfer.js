const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, getAddrBalanceErc, getBalance, getUserBalanceErc, logPairing, HARDHAT_FORK_CHAIN_ID, 
    RPC_URL, PRIV_KEY, PKEY, DAI_ADDR } = require("./TestUtils")
const { Token } = require("../utils/Token")

const PREFUND_AMT = 0.3
const AMOUNT = 60

const getEthSwapToDAI = async (wallet, swapModule, eoa) => {
    console.log("ETH SWAP: ETH=>WETH=>DAI")
    await transferAmt(eoa, wallet.address, AMOUNT)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const DAI = await Token.createFrom(DAI_ADDR)
    const startWalletDAI = await getUserBalanceErc(wallet, DAI.address)

    const tx = await swapModule.createSwap("eth", DAI, AMOUNT)
    await wallet.deployTx(tx)
    const endWalletDAI = await getUserBalanceErc(wallet, DAI.address)

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
    logPairing(AMOUNT, outDiff, "ETH", "DAI")
}

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransfer(to, amount, tokenAddr)
    await wallet.deployTx(transferActionTx)
    
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
    console.log("Difference: ", start - end)
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const funder = new ethers.Wallet(PKEY, provider)

    await transferAmt(funder, eoa.address, AMOUNT + 1)

    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig)
    await wallet.init()

    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))

    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()
    await getEthSwapToDAI(wallet, swapModule, eoa)
    const funderWalletErc20BalanceStart = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)
    console.log("funder starting ERC20:(DAI) balance: ", funderWalletErc20BalanceStart)

    await walletTransferERC(wallet, funder.address, ethers.utils.parseEther("2"), DAI_ADDR)
    const funderWalletErc20BalanceEnd = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)
    console.log("funder ending ERC20:(DAI) balance: ", funderWalletErc20BalanceEnd)
    console.log("funder ERC20:(DAI) Difference: ", funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart)
}

if (typeof require !== 'undefined' && require.main === module) {
    main()
}