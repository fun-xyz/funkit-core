const { Interface, defaultAbiCoder, parseEther } = require("ethers/lib/utils")
const { JsonRpcProvider } = require("@ethersproject/providers")
const { orderParams, verifyValidParametersForLocation, validateClassInstance } = require("./data")
const { Helper, DataFormatError, MissingParameterError } = require("../errors")
const { Chain } = require("../chain/Chain")
const { EoaAuth } = require("../auth")

const getFunctionParamOrderFromInterface = (interface, func) => {
    for (const field of interface.fragments) {
        if (field.name == func && field.type == "function") {
            return field.inputs.map(input => (input.name))
        }
    }
}

const checkAbi = (abi, name, location, isInternal = false) => {
    try {
        return new Interface(abi)
    } catch {
        const helperMainMessage = "Abi is not formatted correctly, please refer to ethers 5.7.2 documentation at: https://docs.ethers.org/v5/api/utils/abi/interface/"
        const helper = new Helper("Abi", abi, helperMainMessage)
        if (!Array.isArray(abi)) {
            helper.pushMessage(`Abi must be of type Array`)
        }

        throw new DataFormatError(name, `abi`, location, helper, isInternal)
    }
}

const verifyValidParamsFromAbi = (abi, func, params, location, isInternal = false) => {
    for (const field of abi) {
        if (field.type == "function" && field.name == func) {
            const missing = field.inputs.filter(input => {
                const data = params[input.name]
                const dataExists = (data !== undefined)
                if (dataExists) {
                    verifyParamIsSolidityType({ ...input, data }, location, isInternal)
                }
                return !dataExists
            }).map(field => (field.name))
            if (missing.length) {
                const helperMainMessage = "Missing these parameters: " + formatMissingForError(missing)
                const helper = new Helper(`${location} was given these parameters`, params, helperMainMessage)
                throw new MissingParameterError(location, helper, isInternal)
            }
        }
    }
}

const encodeContractCall = (interface, encodeFunctionName, input, location, isInternal = false) => {
    verifyValidParamsFromAbi(interface.fragments, encodeFunctionName, input, location, isInternal)
    const paramOrder = getFunctionParamOrderFromInterface(interface, encodeFunctionName)
    const paramsInOrder = orderParams(paramOrder, input)
    return interface.encodeFunctionData(encodeFunctionName, paramsInOrder)
}

const verifyParamIsSolidityType = (param, location, isInternal = false) => {
    try {
        defaultAbiCoder.encode([param.type], [param.data])
    }
    catch {
        const helper = new Helper(param.name, param.data)
        throw new DataFormatError(param.name, `{solidity ${param.type}}`, location, helper, isInternal)
    }
}

const verifyBundlerUrl = async (url) => {
    const provider = new JsonRpcProvider(url)
    const data = await provider.send("web3_clientVersion", [])
    return (data.indexOf("aa-bundler") + 1)
}

const getChainsFromList = async (chains) => {
    const out = chains.map(getChainFromUnlabeledData)
    return await Promise.all(out)
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
    await chain.init()
    return chain
}

const prefundWallet = async (auth, wallet, value, txOptions = global) => {
    const options = await parseOptions(txOptions, "prefundWallet")
    const chain = options.chain
    validateClassInstance(auth, "prefund auth", EoaAuth, "prefundWallet")
    const to = await wallet.getAddress()
    const signer = await auth.getSigner()
    const provider = await chain.getProvider()
    const txSigner = signer.connect(provider)
    const txData = { to, data: "0x", value: parseEther(`${value}`) }
    const tx = await txSigner.sendTransaction(txData)
    return await tx.wait()
}



const SUPPORTED_CHAINS = ["ethereum", "ethereum-goerli", "polygon"]

const paymasterExpectedKeys = ["sponsorAddress", "token"]
const chainExpectedKeys = ["id", "rpc", "bundler", "name"]
const chainExpectedKeysToInput = ["chainId", "rpcUrl", "bundlerUrl", "chainName"]

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

defaultAbiCoder.encodeWith


module.exports = {
    parseOptions, prefundWallet, getChainsFromList, getChainFromUnlabeledData, getFunctionParamOrderFromInterface, checkAbi, encodeContractCall, verifyValidParamsFromAbi
};