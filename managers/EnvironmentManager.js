const { ParameterFormatError, Helper } = require("../errors")
const { verifyValidParametersForLocation } = require("../utils")

const SUPPORTED_CHAINS = ["ethereum", "ethereum-goerli", "polygon"]

const paymasterExpectedKeys = ["sponsorAddress", "token"]

const configureEnvironment = (envOptions) => {
    let { paymaster, apiKey, sendTxLater, chains } = envOptions
    if (paymaster) {
        verifyValidParametersForLocation("EnvironmentConfigError.configureEnvironment", paymaster, paymasterExpectedKeys)
    }
    if (chains && !Array.isArray(chains)) {
        const helperMessage = "chains must be of type array"
        const helper = new Helper("chains", chains, helperMessage)
        throw new ParameterFormatError("configureEnvironment", helper)
    }
    chains = chains ? chains : SUPPORTED_CHAINS
    global = { ...global, paymaster, apiKey, sendTxLater, chains }
}



module.exports = { configureEnvironment }
