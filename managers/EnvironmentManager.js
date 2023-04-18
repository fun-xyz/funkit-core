const { parseOptions } = require("../utils/option")

const configureEnvironment = async (envOptions) => {
    envOptions = { ...global, ...envOptions }
    await parseOptions(envOptions, "EnviromentManager.configureEnvironment")
}

module.exports = { configureEnvironment, parseOptions }
