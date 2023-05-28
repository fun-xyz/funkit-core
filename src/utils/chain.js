const { Eoa } = require("../auth/EoaAuth")
const { getChainFromData } = require("../data")
const { Interface, defaultAbiCoder, parseEther } = require("ethers/lib/utils")
const { orderParams, validateClassInstance, formatMissingForError } = require("./data")
const { Helper, DataFormatError, MissingParameterError } = require("../errors")

const getFunctionParamOrderFromInterface = (interf, func) => {
    for (const field of interf.fragments) {
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

const encodeContractCall = (interf, encodeFunctionName, input, location, isInternal = false) => {
    verifyValidParamsFromAbi(interf.fragments, encodeFunctionName, input, location, isInternal)
    const paramOrder = getFunctionParamOrderFromInterface(interf, encodeFunctionName)
    const paramsInOrder = orderParams(paramOrder, input)
    return interf.encodeFunctionData(encodeFunctionName, paramsInOrder)
}

const verifyParamIsSolidityType = (param, location, isInternal = false) => {
    if (Array.isArray(param.data)) return
    try {
        defaultAbiCoder.encode([param.type], [param.data])
    }
    catch {
        const helper = new Helper(param.name, param.data)
        throw new DataFormatError(param.name, `{solidity ${param.type}}`, location, helper, isInternal)
    }
}

const gasSpecificChain = { "137": 350_000_000_000 }
const fundWallet = async (auth, wallet, value, gasPrice = 0, txOptions = globalEnvOption) => {
    validateClassInstance(auth, "prefund auth", Eoa, "fundWallet")
    const chain = await getChainFromData(txOptions.chain)
    const to = await wallet.getAddress()
    const signer = await auth.getSigner()
    let txSigner = signer
    if (!signer.provider) {
        const provider = await chain.getProvider()
        txSigner = signer.connect(provider)
    }
    let txData;
    if (gasSpecificChain[chain.id]) {
        txData = { to, data: "0x", value: parseEther(`${value}`), gasPrice: gasSpecificChain[chain.id] }
    }
    else {
        txData = { to, data: "0x", value: parseEther(`${value}`) }
    }
    const tx = await txSigner.sendTransaction(txData)
    return await tx.wait()
}

const isContract = async (address, txOptions = global) => {
    const options = await parseOptions(txOptions)
    const chain = options.chain
    const provider = await chain.getProvider()
    try {
        const code = await provider.getCode(address);
        if (code != '0x') return true;
    } catch (error) {
        return false
    }
    return false
}

module.exports = {
    fundWallet, getFunctionParamOrderFromInterface, checkAbi, encodeContractCall, verifyValidParamsFromAbi, isContract
};