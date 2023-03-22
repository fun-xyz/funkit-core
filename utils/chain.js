const { Interface, defaultAbiCoder } = require("ethers/lib/utils")
const { BigNumber, Wallet } = require("ethers")
const { orderParams } = require("./data")
const { Helper, DataFormatError, MissingParameterError } = require("../errors")


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

const objectValuesToBigNumber = (obj) => {
    Object.keys(obj).forEach(key => {
        const val = obj[key]
        if (typeof val == 'object' && val.type == "BigNumber") {
            obj[key] = BigNumber.from(val.hex)
        }
    })
    return obj
}

const getSignerFromPrivateKey = (key) => {
    return new Wallet(key)
}

const getSignerFromProvider = async (provider) => {
    await provider.send('eth_requestAccounts', [])
    return provider.getSigner()
}



module.exports = {
    getFunctionParamOrderFromInterface, checkAbi, encodeContractCall, objectValuesToBigNumber, verifyValidParamsFromAbi, getSignerFromPrivateKey, getSignerFromProvider
};