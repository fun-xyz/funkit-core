const { Chain } = require("../data/Chain")
const { verifyFunctionParameters } = require("./data")
const { JsonRpcProvider } = require("@ethersproject/providers")

const paymasterExpectedKeys = ["sponsorAddress", "token"]

const getChainsFromList = async (chains) => {
    const out = chains.map(implyChainFromData)
    return await Promise.all(out)
}

const verifyBundlerUrl = async (url) => {
    const provider = new JsonRpcProvider(url)
    const data = await provider.send("web3_clientVersion", [])
    return (data.indexOf("aa-bundler") + 1)
}
const parseOptions = async (options, location) => {
    let { gasSponsor, chain } = options
    if (gasSponsor && typeof gasSponsor != "object") {
        verifyFunctionParameters(location, paymaster, paymasterExpectedKeys)
    }
    if (chain) {
        chain = await implyChainFromData(chain)
    }

    return {
        ...options, chain, gasSponsor
    }
}

const implyChainFromData = async (chainIdentifier) => {
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
    implyChainFromData, getChainsFromList, parseOptions
};