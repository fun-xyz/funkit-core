const { Eoa } = require("./auth")
const { Token } = require("./data")
const { configureEnvironment } = require("./managers")
const { FeelessSponsor } = require("./sponsors")
const { GOERLI_PRIVATE_KEY, TEST_PRIVATE_KEY } = require("./utils")


const options = {
    chain: 31337,
    apiKey: "localtest",
}
const main = async () => {
    await configureEnvironment(options)
    const auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    const sponsorAddress = await auth.getUniqueId()
    const sponsor = new FeelessSponsor({
        gasSponsor: {
            sponsorAddress: "",
        }
    })
    console.log(sponsorAddress)
    const log = async () => {
        sponsor.getBalance(sponsorAddress).then((val) => { console.log(val.toString()) })
    }
    await log()
    const stake = await sponsor.setToBlacklistMode()
    await auth.sendTx(stake)
    await log()
}

main()