import * as dotenv from "dotenv"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { TokenSponsor } from "../../src/sponsors"
import { getTestApiKey } from "../getAWSSecrets"
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
    const sponsor = new TokenSponsor()

    await eoa.sendTx(await sponsor.addUsableToken(oracle, tokenAddress, aggergator))

    console.log(await sponsor.getTokenInfo(tokenAddress))
}

//ORACLE=Token oracle address
//address=token to add
//chainlink aggregator=basetoken/usd oracle on your network

// const CHAINLINKAGGREGATOR = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e", ORACLE = "0x601cD9fdF44EcE68bA5FF7b9273b5231d019e301", TOKENADDRESS = ""  //goerli
// const CHAINLINKAGGREGATOR = "", ORACLE = "", TOKENADDRESS = ""
// const CHAINLINKAGGREGATOR = "", ORACLE = "", TOKENADDRESS = ""

// mainnet
const CHAINLINKAGGREGATOR = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    ORACLE = "0x5f0eB0101Afce3859e7cCa629F50a5eFb9911205", //
    TOKENADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" //token to add
paymasterConfig("36865", process.env.WALLET_PRIVATE_KEY, CHAINLINKAGGREGATOR, ORACLE, TOKENADDRESS)