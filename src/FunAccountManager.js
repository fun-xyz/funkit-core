const { env } = require("process")

class FunAccountManager {


    static configureEnvironment = (env_options) => {
        try {
            global.paymaster = env_options.paymaster
            if (env_options.paymaster && (!env_options.paymaster.sponsor_address || !env_options.paymaster.token_name)) throw Error("Incorrect paymaster format.")
            global.api_key = env_options.api_key
            global.sendTxLater = env_options.sendTxLater ? true : false
            global.chains = env_options.chains ? env_options.chains : ["ethereum", "ethereum-goerli", "polygon"]
            if(!Array.isArray(global.chains)) throw Error("Incorrect chains format")
        }
        catch (err) {
            throw Error(`Error configuring. Please refer to documentation. Message: ${err}`)
        }

    }
}
module.exports = { FunAccountManager }

