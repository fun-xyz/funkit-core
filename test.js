const { Eoa } = require("./auth")
const { Token } = require("./data")
const { configureEnvironment } = require("./managers")
const { TokenSponsor } = require("./sponsors")
const { GOERLI_PRIVATE_KEY } = require("./utils")


const options = {
    chain: 5,
    apiKey: "localtest",
}
const main = async () => {
    await configureEnvironment(options)
    let auth = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })

    const sponsor = new TokenSponsor({
        gasSponsor: {
            sponsorAddress: "",
            token: ""
        }
    })

    await auth.sendTx(await sponsor.stake("0x175C5611402815Eba550Dad16abd2ac366a63329", 4.2))
}

main()