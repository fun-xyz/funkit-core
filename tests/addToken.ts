import * as dotenv from "dotenv"
import { getTestApiKey } from "./getAWSSecrets"
import { Eoa } from "../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../src/config"
import { TokenSponsor } from "../src/sponsors"
dotenv.config()

const getOptions = async (chain = 36865) => {
    const options: GlobalEnvOption = {
        chain: chain.toString(),
        apiKey: await getTestApiKey()
    }
    return options
}

const paymasterConfig = async (chainId, privateKey, aggergator, oracle, tokenAddress) => {
    await configureEnvironment(await getOptions(chainId))
    // const tokenAddress = await Token.getAddress("usdc")
    const eoa = new Eoa({ privateKey: privateKey })
    const sponsor = new TokenSponsor({
        chain: "5",
        gasSponsor: {
            sponsorAddress: "0x1c1adFD4b2c21D8a1e39153D394d8309Db383E43",
            token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        }
    })

    await eoa.sendTx(await sponsor.addUsableToken(oracle, tokenAddress, aggergator))

    console.log(await sponsor.getTokenInfo(tokenAddress))
}

//ORACLE=Token oracle address
//address=token to add
//chainlink aggregator=basetoken/usd oracle on your network

const CHAINLINKAGGREGATOR = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    ORACLE = "0x601cD9fdF44EcE68bA5FF7b9273b5231d019e301",
    TOKENADDRESS = "0xAA8958047307Da7Bb00F0766957edeC0435b46B5" //goerli

//Goerli Address: FUNUSDT: 0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767, FUNDAI: 0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093, FUNUSDC 0xAA8958047307Da7Bb00F0766957edeC0435b46B5

// const CHAINLINKAGGREGATOR = "", ORACLE = "", TOKENADDRESS = ""
// const CHAINLINKAGGREGATOR = "", ORACLE = "", TOKENADDRESS = ""

// mainnet
// const CHAINLINKAGGREGATOR = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
//     ORACLE = "0x5f0eB0101Afce3859e7cCa629F50a5eFb9911205", //
//     TOKENADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" //token to add
paymasterConfig("5", "0x968535da93516f705f89f8d833a5cf84b1b43d397502d567ff5635f0192d68e5", CHAINLINKAGGREGATOR, ORACLE, TOKENADDRESS)
