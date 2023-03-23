const { constants } = require("ethers")
const { isHexString, hexlify } = require("ethers/lib/utils")
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

const validateType = (data, dataName, type, location = "", isInternal = false) => {
    if (typeof data == type) {
        return;
    }
    const helper = new Helper(dataName, data)
    throw new DataFormatError(dataName, type, location, helper, isInternal);
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
    return options.filter(key => (!!input[key]))
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

const flattenObj = (obj) => {
    let out = {}
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] == "object" && !Array.isArray(obj[key])) {
            out = { ...out, ...flattenObj(obj[key]) }
        }
        else {
            out[key] = obj[key]
        }
    })
    return out
}

const objValToArray = (obj) => {
    let out = {}
    for (const [key, value] of Object.entries(obj)) {
        out[key] = [value]
    }
    return out
}


const deepHexlify = (obj) => {
    if (typeof obj === 'function') {
        return undefined;
    }
    if (obj == null || typeof obj === 'string' || typeof obj === 'boolean') {
        return obj;
    }
    else if (obj._isBigNumber != null || typeof obj !== 'object') {
        return hexlify(obj).replace(/^0x0/, '0x');
    }
    if (Array.isArray(obj)) {
        return obj.map(member => deepHexlify(member));
    }
    return Object.keys(obj).reduce((set, key) => (Object.assign(Object.assign({}, set), { [key]: deepHexlify(obj[key]) })), {});
}

class Enum {
    constructor(data) {
        data.map((type, i) => { this[type] = i })
    }
}


module.exports = { Enum, objectValuesToBigNumber, deepHexlify, objValToArray, flattenObj, getUsedParametersFromOptions, validateType, validateClassInstance, compareToExpectedStructure, orderParams, verifyValidParametersForLocation, verifyPrivateKey };