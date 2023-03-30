const { parseOptions } = require("../utils/option")


const configureEnvironment = async (envOptions) => {
    envOptions = { ...global, ...envOptions }
    const parsedOptions = await parseOptions(envOptions, "EnviromentManager.configureEnvironment")
    global = { ...global, ...parsedOptions }
}


module.exports = { configureEnvironment, parseOptions }
