const { Contract } = require("ethers");
const { Eoa } = require("./auth");
const { Token } = require("./data");
const { configureEnvironment, parseOptions } = require("./managers");
const { MultiTokenSponsor } = require("./sponsors/MultiTokenSponsor");
const { TEST_PRIVATE_KEY, prefundWallet } = require("./utils");
const { FunWallet } = require("./wallet");

const entrypointAbi = require("./abis/EntryPoint.json").abi

// FORK MAINNET
const oracleAddress = require("./paymaster.json").oracle
const aggregator = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419"
const token = "usdc"

const options = {
    chain: 1337,
    apiKey: "localtest",
    gasSponsor: ""

}

const main = async () => {
    await configureEnvironment(options)
    const funder = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    const funderAddress = await funder.getUniqueId()

    const salt = await funder.getUniqueId()
    const wallet = new FunWallet({ salt, index: 0 })
    const walletAddress = await wallet.getAddress()

    const chain = global.chain
    const provider = await chain.getProvider()
    const entryPointAddr = await chain.getAddress("entryPointAddress")

    const entryPointContract = new Contract(entryPointAddr, entrypointAbi, provider)

    await prefundWallet(funder, wallet, 10)
    await wallet.swap(funder, {
        in: "eth",
        amount: 1,
        out: token,
        options: {
            returnAddress: funderAddress
        }
    })

    const sponsor = new MultiTokenSponsor({
        gasSponsor: {
            sponsorAddress: funderAddress,
            token
        }
    })

    const setToken = await sponsor.addUsableToken(oracleAddress, token, aggregator)
    await funder.sendTx(setToken)
    const ethstakeAmount = 10
    const usdcStakeAmount = 100
    const stake = await sponsor.stake(funderAddress, ethstakeAmount)
    await funder.sendTx(stake)
    const approve = await sponsor.approve(token, usdcStakeAmount)
    const stakeToken = await sponsor.stakeToken(token, walletAddress, usdcStakeAmount)
    await funder.sendTx(approve)
    await funder.sendTx(stakeToken)
    const globalMode = await sponsor.setGlobalToBlacklistMode()
    await funder.sendTx(globalMode)
    
    const listmode = await sponsor.removeSpenderFromGlobalBlackList(walletAddress)
    await funder.sendTx(listmode)

    await configureEnvironment({
        gasSponsor: {
            sponsorAddress: funderAddress,
            token
        }
    })

    console.log("PRE: ")
    await logTokenBalance(token, walletAddress)
    await wallet.swap(funder, {
        in: "eth",
        amount: 1,
        out: token,
    })
    console.log("POST: ")

    await logTokenBalance(token, walletAddress)

}

const logTokenBalanceSponsor = async (sponsor, token, spender) => {
    const tokenBalance = await sponsor.getTokenBalance(token, spender)
    console.log(tokenBalance)
}

const logTokenBalance = async (token, address) => {
    const funderTokenAmount = await Token.getBalance(token, address)
    console.log(funderTokenAmount)
}

main()