const { Chain } = require("../data/Chain")
const { verifyFunctionParams } = require("./data")
const { JsonRpcProvider } = require("@ethersproject/providers")
const { getOrgInfo } = require("../utils/dashboard")
const testApiKey = "nbiQS2Ut932ewF5TqiCpl2ZTUqPWb1P29N8GcJjy"
const paymasterExpectedKeys = ["sponsorAddress", "token"]

const getChainsFromList = async (chains) => {
    const out = chains.map(getChainFromData)
    return await Promise.all(out)
}

const verifyBundlerUrl = async (url) => {
    const provider = new JsonRpcProvider(url)
    const data = await provider.send("web3_clientVersion", [])
    return (data.indexOf("aa-bundler") + 1)
}

//set defaults
const checkEnvironment = async (options) => {
    options.chain = options.chain ? options.chain : 5
    options.apiKey = options.apiKey ? options.apiKey : testApiKey
    return options
}

const parseOptions = async (options, location) => {
    options = await checkEnvironment(options)
    let { gasSponsor, chain, apiKey, orgInfo } = options
    if (gasSponsor && typeof gasSponsor != "object") {
        verifyFunctionParams(location, paymaster, paymasterExpectedKeys)
    }
    if (chain && !(chain instanceof Chain) && chain!=global.chain?.chainId) {
        chain = await getChainFromData(chain)
    }
    if ((apiKey && !global.orgInfo) || (apiKey != global.apiKey)) {
        // orgInfo = await getOrgInfo(options.apiKey)
        orgInfo = "fun"
    }
    global = { ...global, ...options, chain, gasSponsor, orgInfo, apiKey }

    return {
        ...options, chain, gasSponsor, orgInfo
    }
}

const getChainFromData = async (chainIdentifier) => {
    let chain

    if (chainIdentifier instanceof Chain) {
        return chainIdentifier
    }
    if (Number(chainIdentifier)) {
        chain = new Chain({ chainId: chainIdentifier })
    }
    else if (chainIdentifier.indexOf("http") + 1) {
        if (await verifyBundlerUrl(chainIdentifier)) {
            chain = new Chain({ bundlerUrl: chainIdentifier })
        } else {
            chain = new Chain({ rpcUrl: chainIdentifier })
        }
    }
    else {
        chain = new Chain({ chainName: chainIdentifier })
    }
    return chain
}


module.exports = {
    getChainFromData, getChainsFromList, parseOptions
};