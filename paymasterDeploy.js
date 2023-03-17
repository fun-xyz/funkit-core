const paymasterAbi = require("./utils/abis/TokenPaymaster.json")
const oracleAbi = require("./utils/abis/TokenPriceOracle.json")

const main = async () => {

    const token = USDC_ADDR;
    const aggregator = CHAINLINK_TOKEN_AGGREGATOR_ADDRESS;
    const entryPointAddress = require(forkConfigPath).entryPointAddress
    const tokenPriceOracleAddress = require(forkConfigPath).tokenPriceOracleAddress
    const params = [entryPointAddress, tokenPriceOracleAddress, token, aggregator]

}