import { isHex, toHex } from "viem"
import { HashZero } from "../common"
import { DataFormatError, Helper, MissingParameterError } from "../errors"

const compareToExpectedParams = (input: any, expected: string[]) => {
    return expected.filter((key: any) => {
        if (typeof key === "string") {
            return !input[key]
        }
        if (Array.isArray(key)) {
            for (const subkey of key) {
                if (input[subkey]) {
                    return false
                }
            }
            return true
        }
        return undefined
    })
}

export const verifyFunctionParams = (location: string, input: any, expected: string[]) => {
    const missing = compareToExpectedParams(input, expected)
    if (missing.length) {
        const helperMainMessage = "Missing these parameters: " + formatMissingForError(missing)
        const helper = new Helper(`${location} was given these parameters`, input, helperMainMessage)
        throw new MissingParameterError(location, helper)
    }
}

export const formatMissingForError = (missing: any) => {
    let out = ""
    for (const term of missing) {
        if (typeof term === "string") {
            out += `${term}, `
        }
        if (Array.isArray(term)) {
            out += `${formatMissingForErrorOrMode(term)}, `
        }
    }
    return out.slice(0, -2)
}

const formatMissingForErrorOrMode = (missing: any) => {
    let out = "("
    for (const term of missing) {
        out += `${term} or `
    }
    return out.slice(0, -4) + ")"
}

export const orderParams = (paramOrder: any, input: any) => {
    return paramOrder.map((item: any) => input[item])
}

export const verifyPrivateKey = (value: string, location = "", isInternal = false) => {
    let helperMsg = ""
    const isHashZero = value === HashZero
    if (isHashZero) {
        helperMsg = "privateKey can not be equal to bytes32(0)"
    }
    if (!isHex(value) || isHashZero) {
        const helper = new Helper("privateKey", value, helperMsg)
        throw new DataFormatError("privateKey", "{bytes32}", location, helper, isInternal)
    }
}

export const verifyIsArray = (value: any, location = "", isInternal = false) => {
    if (!Array.isArray(value)) {
        const helper = new Helper("Data", value, "Data must be of type Array")
        throw new DataFormatError("Data", "array", location, helper, isInternal)
    }
}

export const flattenObj = (obj: any) => {
    let out: any = {}
    Object.keys(obj).forEach((key: any) => {
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            out = { ...out, ...flattenObj(obj[key]) }
        } else {
            out[key] = obj[key]
        }
    })
    return out
}

export const deepHexlify = (obj: any): any => {
    if (typeof obj === "function") {
        return undefined
    }
    if (!obj || typeof obj === "string" || typeof obj === "boolean") {
        return obj
    } else if (obj._isBigNumber || typeof obj !== "object") {
        return toHex(obj).replace(/^0x0/, "0x")
    }
    if (Array.isArray(obj)) {
        return obj.map((member) => deepHexlify(member))
    }
    return Object.keys(obj).reduce((set, key) => Object.assign(Object.assign({}, set), { [key]: deepHexlify(obj[key]) }), {})
}
