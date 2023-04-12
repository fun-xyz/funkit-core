const { Eoa } = require("./auth")
const { Token } = require("./data")
const { configureEnvironment } = require("./managers")
const { FeelessSponsor } = require("./sponsors")
const { GOERLI_PRIVATE_KEY, TEST_PRIVATE_KEY } = require("./utils")


const options = {
    chain: 31337,
    apiKey: "localtest",
}

const walletAddress = "0xDAa50eBD016469aeCb33a88E9A3547639b157Ba7"

const main = async () => {
    await configureEnvironment(options)
    const auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    const sponsorAddress = await auth.getUniqueId()
    const sponsor = new FeelessSponsor({
        gasSponsor: {
            sponsorAddress: "",
        }
    })

    const log = async () => {
        sponsor.getBalance(sponsorAddress).then((val) => { console.log(val.toString()) })
    }
    await log()
    const blacklist = await sponsor.setToBlacklistMode()
    const stake = await sponsor.stake(sponsorAddress, 1)
    await auth.sendTx(stake)
    await auth.sendTx(blacklist)
    await log()
}

main()