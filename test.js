const { Eoa } = require("./auth");
const { Token } = require("./data");
const { configureEnvironment } = require("./managers");
const { MultiTokenSponsor } = require("./sponsors/MultiTokenSponsor");
const { TEST_PRIVATE_KEY, prefundWallet } = require("./utils");
const { FunWallet } = require("./wallet");

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

    await prefundWallet(funder, wallet, 10)

    await wallet.swap(funder, {
        in: "eth",
        amount: 1,
        out: token,
    })

    await logTokenBalance("weth", walletAddress)


    const sponsor = new MultiTokenSponsor({
        gasSponsor: {
            sponsorAddress: funderAddress,
            token
        }
    })

    const setToken = await sponsor.addUsableToken(oracleAddress, token, aggregator)
    await funder.sendTx(setToken)

    const tokenData = await sponsor.getToken(token)
    console.log(tokenData)

    const ethstakeAmount = 10
    const stake = await sponsor.stake(funderAddress, ethstakeAmount)
    await funder.sendTx(stake)
    await logTokenBalanceSponsor(sponsor, "eth", funderAddress)



    const usdcStakeAmount = 100
    const stakeToken = await sponsor.stakeToken(token, walletAddress, usdcStakeAmount)
    await funder.sendTx(stakeToken)

    await logTokenBalanceSponsor(sponsor, token, walletAddress)

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