const { Eoa } = require("./auth")
const { Token } = require("./data")
const { configureEnvironment } = require("./managers")
const { TokenSponsor } = require("./sponsors")
const { GOERLI_PRIVATE_KEY, TEST_PRIVATE_KEY,prefundWallet } = require("./utils")
const { FunWallet } = require("./wallet")


const options = {
    chain: 36864,
    apiKey: "localtest",
}

const paymasterToken = "usdc"

const main = async () => {
    await configureEnvironment(options)
    const auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    const funder = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    const sponsorAddress = await auth.getUniqueId()


    const salt = await auth.getUniqueId()
    const wallet = new FunWallet({ salt, index: 0 })
    await prefundWallet(funder, wallet, 1)
    const walletAddress = await wallet.getAddress()

    await wallet.swap(auth, {
        in: "eth",
        amount: 1,
        out: "usdc",
        options: {
            returnAddress: sponsorAddress
        }
    })
    await configureEnvironment({
        gasSponsor: {
            sponsorAddress: sponsorAddress,
            token: paymasterToken,
        }
    })

    const gasSponsor = new TokenSponsor()

    const ethstakeAmount = 1
    const usdcStakeAmount = 100

    const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
    const depositInfo1S = await gasSponsor.getTokenBalance("eth", sponsorAddress)


    const approve = await gasSponsor.approve(paymasterToken, usdcStakeAmount * 2)
    const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, usdcStakeAmount)
    // const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, usdcStakeAmount)
    const data = await gasSponsor.stake(sponsorAddress, ethstakeAmount)
    const addTokens = await gasSponsor.addUsableToken("0x0B45A73ce2AF112020e039c93a4C272c7cA9e3A0", "usdc", "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419")

    // await funder.sendTx(approve)
    // // await funder.sendTx(deposit)
    // await funder.sendTx(data)
    await funder.sendTx(addTokens)

    const depositInfoE = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
    const depositInfo1E = await gasSponsor.getTokenBalance("eth", sponsorAddress)
}

main()