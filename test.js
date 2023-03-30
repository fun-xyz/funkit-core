const { Contract, BigNumber } = require("ethers");
const { parseUnits, formatUnits } = require("ethers/lib/utils");
const { Eoa } = require("./auth");
const { Token } = require("./data");
const { configureEnvironment } = require("./managers");
const { TokenSponsor } = require("./sponsors/TokenSponsor");
const { TEST_PRIVATE_KEY, prefundWallet, GOERLI_PRIVATE_KEY, GOERLI_FUNDER_PRIVATE_KEY } = require("./utils");
const { FunWallet } = require("./wallet");

const entrypointAbi = require("./abis/EntryPoint.json").abi

// FORK MAINNET
const aggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e"
// usdc
const token = "0xaa8958047307da7bb00f0766957edec0435b46b5"

// usdt 
// const token = "0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767"

// dai 
// const token =  "0x855af47cdf980a650ade1ad47c78ec1deebe9093"

const oracle = "0xc2192f8f00FA1D831Dc227b5202041f5F910d6b8"
const options = {
    chain: 5,
    apiKey: "localtest",

}

const main = async () => {
    await configureEnvironment(options)
    const funder = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
    const funderAddress = await funder.getUniqueId()
    // const salt = await funder.getUniqueId()
    // const wallet = new FunWallet({ salt, index: 3543 })
    // const walletAddress = await wallet.getAddress()
    // console.log(walletAddress)

    // console.log("wallet eth balance:", await Token.getBalance("eth", walletAddress))
    // console.log(funderAddress)
    // const provider = await global.chain.getProvider()
    // const entrypointaddr = "0x0576a174d229e3cfa37253523e645a78a0c91b57"
    // const entrypoint = new Contract(entrypointaddr, entrypointAbi, provider)

    // await prefundWallet(funder, wallet, .1)
    // await wallet.swap(funder, {
    //     in: "eth",
    //     amount: 1,
    //     out: token,
    //     options: {
    //         returnAddress: funderAddress
    //     }
    // })

    const sponsor = new TokenSponsor({
        gasSponsor: {
            sponsorAddress: funderAddress,
            token
        }
    })

    const setToken = await sponsor.addUsableToken(oracle, token, aggregator)
    await funder.sendTx(setToken)

    const data = await sponsor.getTokenInfo(token)
    console.log(data)

    // await logTokenBalanceSponsor(sponsor, token, walletAddress)
    // await logTokenBalanceSponsor(sponsor, "eth", funderAddress)
    // const ethstakeAmount = 3
    // const usdcStakeAmount = 15
    // const stake = await sponsor.stake(funderAddress, ethstakeAmount)
    // await funder.sendTx(stake)
    // const approve = await sponsor.approve(token, usdcStakeAmount)
    // const stakeToken = await sponsor.stakeToken(token, walletAddress, usdcStakeAmount)
    // await funder.sendTx(approve)
    // await funder.sendTx(stakeToken)
    // const globalMode = await sponsor.setGlobalToBlacklistMode()
    // await funder.sendTx(globalMode)

    // console.log("postfund")
    // await logTokenBalanceSponsor(sponsor, token, walletAddress)
    // await logTokenBalanceSponsor(sponsor, "eth", funderAddress)

    // const listmode = await sponsor.removeSpenderFromGlobalBlackList(walletAddress)
    // await funder.sendTx(listmode)

    // await configureEnvironment({
    //     gasSponsor: {
    //         sponsorAddress: funderAddress,
    //         token
    //     }
    // })

    // console.log("PRE: ")
    // await logTokenBalance(token, walletAddress)
    // await wallet.swap(funder, {
    //     in: "eth",
    //     amount: .01,
    //     out: token,
    // })
    // console.log("POST: ")

    // await logTokenBalance(token, walletAddress)

}

const logTokenBalanceSponsor = async (sponsor, token, spender) => {
    const tokenBalance = await sponsor.getTokenBalance(token, spender)
    console.log(formatUnits(tokenBalance.toString(), 18))
}

const logTokenBalance = async (token, address) => {
    const funderTokenAmount = await Token.getBalance(token, address)
    console.log(funderTokenAmount)
}

main()

// (250000 + 250000 * 3 + 58960)*0x59682f00

// 

// console.log(formatUnits(BigNumber.from(2676468), 6))