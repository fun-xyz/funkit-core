const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, getAddrBalanceErc, getBalance, getUserBalanceErc, logPairing, HARDHAT_FORK_CHAIN_ID,
    RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY, AVAX_CHAIN_ID, AVAX_RPC_URL, USDC_AVAX_ADDR, AVAX_RECEIVE_PKEY } = require("./TestUtils")
const { Token, TokenTypes } = require("../utils/Token")

const PREFUND_AMT = 0.3
const AMOUNT = 60

const getEthSwapToDAI = async (wallet, swapModule, eoa) => {
    console.log("ETH SWAP: ETH=>WETH=>DAI")
    await transferAmt(eoa, wallet.address, AMOUNT)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const startWalletDAI = await getUserBalanceErc(wallet, await DAI_ADDR)


    const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
    const DAI = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })

    const tx = await swapModule.createSwapTx(tokenIn, DAI, AMOUNT, wallet.address, 5, 100)
    await wallet.deployTx(tx)
    const endWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
    logPairing(AMOUNT, outDiff, "ETH", "DAI")
}

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
    const receipt = await wallet.deployTx(transferActionTx)
    console.log(receipt)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
    console.log("Difference: ", start - end)
}

const forkTransfer = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const funder = new ethers.Wallet(PKEY, provider)

    await transferAmt(funder, eoa.address, AMOUNT + 1)

    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
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

const testNetTransfer = async () => {
    const PREFUND_AMT = 0

    const provider = new ethers.providers.JsonRpcProvider(AVAX_RPC_URL)
    const sender = new ethers.Wallet(PRIV_KEY, provider)
    const receiver = new ethers.Wallet(AVAX_RECEIVE_PKEY, provider)

    const walletConfig = new FunWalletConfig(sender, AVAX_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()


    console.log("sender address", sender.address)
    console.log("receiver address", receiver.address)
    console.log("wallet avax balance: ", await getBalance(wallet))
    console.log("sender avax balance: ", await getBalance(sender))
    console.log("receiver avax balance: ", await getBalance(receiver))

    const funderWalletErc20BalanceStart = await getAddrBalanceErc(sender, USDC_AVAX_ADDR, receiver.address)
    console.log("receiver starting ERC20:(USDC) balance: ", funderWalletErc20BalanceStart)
    await walletTransferERC(wallet, receiver.address, "100", USDC_AVAX_ADDR) //1000000 = 1usdc
    const funderWalletErc20BalanceEnd = await getAddrBalanceErc(sender, USDC_AVAX_ADDR, receiver.address)
    console.log("receiver ending ERC20:(USDC) balance: ", funderWalletErc20BalanceEnd)
    console.log("receiver ERC20:(USDC) Difference: ", funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart)
}

if (typeof require !== 'undefined' && require.main === module) {
    console.log("\n\n::::::TOKEN TRANSFER TEST::::::")

    const type = process.argv[2]
    if (type === 'testnet') {
        testNetTransfer()
    }
    else if (type === 'fork') {
        forkTransfer()
    }
    else {
        throw "Not a valid test type. See README"
    }
}