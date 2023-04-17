const { Chain } = require("../data/Chain")
const { verifyFunctionParams } = require("./data")
const { JsonRpcProvider } = require("@ethersproject/providers")

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
    return options
}

const parseOptions = async (options, location) => {
    options = await checkEnvironment(options)
    let { gasSponsor, chain } = options
    if (gasSponsor && typeof gasSponsor != "object") {
        verifyFunctionParams(location, paymaster, paymasterExpectedKeys)
    }
    if (chain) {
        chain = await getChainFromData(chain)
    }

    return {
        ...options, chain, gasSponsor
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