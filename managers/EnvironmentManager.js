const { parseOptions } = require("../utils/option")
const { getOrgInfo } = require("../utils/dashboard")
const configureEnvironment = async (envOptions) => {
    envOptions = { ...global, ...envOptions }
    const parsedOptions = await parseOptions(envOptions, "EnviromentManager.configureEnvironment")
    const orgInfo = await getOrgInfo(global.apiKey)
    global = { ...global, ...parsedOptions, orgInfo }
}

module.exports = { configureEnvironment, parseOptions }
