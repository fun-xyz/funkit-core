const { parseOptions } = require("../utils")
// const { verifyValidParametersForLocation, getChainsFromList, getUsedParametersFromOptions, getChainFromUnlabeledData } = require("../utils")



const configureEnvironment = async (envOptions) => {
    const parsedOptions = await parseOptions(envOptions, "EnvironmentConfigError.configureEnvironment")
    global = { ...global, ...parsedOptions }
}



module.exports = { configureEnvironment, parseOptions }
