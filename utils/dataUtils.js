const { constants } = require("ethers")
const { isHexString } = require("ethers/lib/utils")
const { MissingParameterError, Helper, DataFormatError } = require("../errors")

const compareToExpectedStructure = (input, expected) => {
    return expected.filter(key => {
        if (typeof key == "string") {
            return !input[key]
        }
        if (Array.isArray(key)) {
            for (let subkey of key) {
                if (input[subkey]) {
                    return false
                }
            }
            return true
        }
    })
}

const verifyValidParametersForLocation = (location, input, expected) => {
    const missing = compareToExpectedStructure(input, expected)
    if (missing.length) {
        const helperMainMessage = "Missing these parameters: " + formatMissingForError(missing)
        const helper = new Helper(`${location} was given these parameters`, input, helperMainMessage)
        throw new MissingParameterError(location, helper)
    }
}

const validateClassInstance = (data, dataName, classObj, location = "", isInternal = false) => {
    if (data instanceof classObj) {
        return;
    }
    const helper = new Helper(dataName, data)
    throw new DataFormatError(dataName, classObj.name, location, helper, isInternal);

}
const formatMissingForError = (missing) => {
    let out = ""
    for (let term of missing) {
        if (typeof term == "string") {
            out += `${term}, `
        }
        if (Array.isArray(term)) {
            out += `${formatMissingForErrorOrMode(term)}, `
        }
    }
    return out.slice(0, -2)
}

const formatMissingForErrorOrMode = (missing) => {
    let out = "("
    for (let term of missing) {
        out += `${term} or `
    }
    return out.slice(0, -4) + ")"
}
const orderParams = (paramOrder, input) => {
    return paramOrder.map(item => (input[item]))
}


const getUsedParametersFromOptions = (input, options) => {
    return options.filter(key => (input[key]))
}

const verifyPrivateKey = (value, location = "", isInternal = false) => {
    let helperMsg = ""
    const isHashZero = value == constants.HashZero
    if (isHashZero) {
        helperMsg = "privateKey can not be equal to bytes32(0)"
    }
    if (!isHexString(value, 32) || isHashZero) {
        const helper = new Helper("privateKey", value, helperMsg)
        throw new DataFormatError("privateKey", "{bytes32}", location, helper, isInternal)
    }

}


module.exports = { getUsedParametersFromOptions, validateClassInstance, compareToExpectedStructure, orderParams, verifyValidParametersForLocation, verifyPrivateKey };