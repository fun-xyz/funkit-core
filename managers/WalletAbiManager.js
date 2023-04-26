const { constants } = require("ethers")
const { verifyFunctionParams, validateDataType, verifyIsArray } = require("../utils/data")
const { verifyValidParamsFromAbi, checkAbi, encodeContractCall } = require("../utils/chain")
const { hexConcat } = require("ethers/lib/utils")

const encodeCallExpectedKeys = ["to", "data"]
const initCodeExpectedKeys = ["uniqueID", "entryPointAddress", "factoryAddress", "verificationAddress", "owner"]

const encodeFeeCallExpectedKeys = ["to", "data", "token", "amount", "recipient"]
class WalletAbiManager {
    constructor(walletAbi, factoryAbi) {
        const errorLocation = "WalletAbiManager constructor"
        this.walletInterface = checkAbi(walletAbi, "FunWallet", errorLocation, true)
        this.factoryInterface = checkAbi(factoryAbi, "FunWalletFactory", errorLocation, true)
    }

    encodeCall(input, location = "WalletAbiManager.encodeCall") {
        if (input.token) {
            return this.encodeFeeCall(input)
        }
        verifyFunctionParams(location, input, encodeCallExpectedKeys)
        let { to: dest, data, value } = input
        if (Array.isArray(data)) {
            data = data[1]
        }
        if (Array.isArray(value)) {
            value = value[1]
        } else {
            value = value ? value : 0
        }
        const encodeObj = { dest, data, value }
        return this.encodeWalletCall("execFromEntryPointOrOwner", encodeObj)
    }

    encodeFeeCall(input, location = "WalletAbiManager.encodeFeeCall") {
        verifyFunctionParams(location, input, encodeFeeCallExpectedKeys)
        let { to: dest, data, value, token, amount, recipient, oracle } = input
        if (Array.isArray(data)) {
            data = data[1]
        }
        if (Array.isArray(value)) {
            value = value[1]
        } else {
            value = value ? value : 0
        }

        const feedata = [token, recipient, oracle, amount]
        const encodeObj = { dest, data, value, feedata }
        return this.encodeWalletCall("execFromEntryPointOrOwnerWithFee", encodeObj)
    }

    encodeInitExecCall(input, location = "WalletAbiManager.encodeInitExecCall", isInternal = false) {
        if (input.token) {
            return this.encodeInitExecFeeCall(input)
        }
        verifyFunctionParams(location, input, encodeCallExpectedKeys)
        let { to: dest, data, value } = input
        verifyIsArray(data, location)
        if (value) {
            verifyIsArray(value, location)
        }
        else {
            value = [0, 0]
        }
        const encodeObj = { dest, data, value }
        return encodeContractCall(this.walletInterface, "initAndExec", encodeObj, location, isInternal)
    }

    encodeInitExecFeeCall(input, location = "WalletAbiManager.encodeInitExecFeeCall", isInternal = false) {
        verifyFunctionParams(location, input, encodeFeeCallExpectedKeys)
        let { to: dest, data, value, token, amount, recipient } = input
        verifyIsArray(data, location)
        if (value) {
            verifyIsArray(value, location)
        }
        else {
            value = [0, 0]
        }
        const feedata = [token, recipient, amount]
        const encodeObj = { dest, data, value, feedata }
        return encodeContractCall(this.walletInterface, "initAndExec", encodeObj, location, isInternal)
    }


    encodeWalletCall(encodeFunctionName, input, location = "WalletAbiManager.encodeWalletCall", isInternal = false) {
        return encodeContractCall(this.walletInterface, encodeFunctionName, input, location, isInternal)
    }

    encodeFactoryCall(encodeFunctionName, input, location = "WalletAbiManager.encodeFactoryCall", isInternal = false) {
        return encodeContractCall(this.factoryInterface, encodeFunctionName, input, location, isInternal)
    }

    getInitCode(input) {
        verifyFunctionParams("WalletAbiManager.getInitCode", input, initCodeExpectedKeys)

        const { uniqueID, entryPointAddress, verificationAddress, owner, implementation } = input

        const initCodeParams = {
            salt: uniqueID, _entryPointAddr: entryPointAddress, _userAuthAddr: verificationAddress, _owner: owner
        }
        if (!implementation) {
            initCodeParams.implementation = constants.AddressZero
        } else {
            initCodeParams.implementation = implementation
        }

        verifyValidParamsFromAbi(this.walletInterface.fragments, "initialize", initCodeParams, "WalletAbiManager.getInitCode")
        initCodeParams.initializerCallData = this.encodeWalletCall("initialize", initCodeParams)
        verifyValidParamsFromAbi(this.factoryInterface.fragments, "createAccount", initCodeParams, "WalletAbiManager.getInitCode")
        const data = this.encodeFactoryCall("createAccount", initCodeParams, "WalletAbiManager.getInitCode")
        return hexConcat([input.factoryAddress, data])
    }
}


module.exports = { WalletAbiManager }