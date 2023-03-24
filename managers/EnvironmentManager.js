const { parseOptions } = require("../utils")
// const { verifyValidParametersForLocation, getChainsFromList, getUsedParametersFromOptions, getChainFromUnlabeledData } = require("../utils")



const configureEnvironment = async (envOptions) => {
    envOptions = { ...global, ...envOptions }
    const parsedOptions = await parseOptions(envOptions, "EnviromentManager.configureEnvironment")
    global = { ...global, ...parsedOptions }
}


module.exports = { configureEnvironment, parseOptions }
