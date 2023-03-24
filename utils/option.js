const { Chain } = require("../data/chain")

const { verifyValidParametersForLocation } = require("./data")

const SUPPORTED_CHAINS = ["ethereum", "ethereum-goerli", "polygon"]

const paymasterExpectedKeys = ["sponsorAddress", "token"]
const chainExpectedKeys = ["id", "rpc", "bundler", "name"]
const chainExpectedKeysToInput = ["chainId", "rpcUrl", "bundlerUrl", "chainName"]


const getChainsFromList = async (chains) => {
    const out = chains.map(getChainFromUnlabeledData)
    return await Promise.all(out)
}
const parseOptions = async (options, location) => {
    const { paymaster, chain } = options
    if (paymaster) {
        verifyValidParametersForLocation(location, paymaster, paymasterExpectedKeys)
    }

    // if (chain) {
    //     verifyValidParametersForLocation("EnvironmentConfigError.configureEnvironment", chain, [chainExpectedKeys])
    // }

    // const [key] = getUsedParametersFromOptions(chain, chainExpectedKeys[0])
    // let chainInput = { [chainExpectedKeysToInput[chainExpectedKeys.indexOf(key)]]: chain[key] }

    return {
        ...options, chain: await getChainFromUnlabeledData(chain)
    }
}

const getChainFromUnlabeledData = async (chainIdentifier) => {
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
    getChainFromUnlabeledData, getChainsFromList, parseOptions
};