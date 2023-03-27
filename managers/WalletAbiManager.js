const { constants } = require("ethers")
const { verifyValidParametersForLocation, validateType, verifyIsArray } = require("../utils/data")
const { verifyValidParamsFromAbi, checkAbi, encodeContractCall } = require("../utils/chain")
const { hexConcat } = require("ethers/lib/utils")


const encodeCallExpectedKeys = ["to", "data"]
const initCodeExpectedKeys = ["salt", "entryPointAddress", "factoryAddress", "verificationAddress", "owner"]

class WalletAbiManager {
    constructor(walletAbi, factoryAbi) {
        const errorLocation = "WalletAbiManager constructor"
        this.walletInterface = checkAbi(walletAbi, "FunWallet", errorLocation, true)
        this.factoryInterface = checkAbi(factoryAbi, "FunWalletFactory", errorLocation, true)
    }

    encodeCall(input, location = "WalletAbiManager.encodeCall") {
        verifyValidParametersForLocation(location, input, encodeCallExpectedKeys)
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

    encodeInitExecCall(input, location = "WalletAbiManager.encodeInitExecCall", isInternal = false) {
        verifyValidParametersForLocation(location, input, encodeCallExpectedKeys)
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

    encodeWalletCall(encodeFunctionName, input, location = "WalletAbiManager.encodeWalletCall", isInternal = false) {
        return encodeContractCall(this.walletInterface, encodeFunctionName, input, location, isInternal)
    }



    encodeFactoryCall(encodeFunctionName, input, location = "WalletAbiManager.encodeFactoryCall", isInternal = false) {
        return encodeContractCall(this.factoryInterface, encodeFunctionName, input, location, isInternal)
    }

    getInitCode(input) {
        verifyValidParametersForLocation("WalletAbiManager.getInitCode", input, initCodeExpectedKeys)

        const { salt, entryPointAddress, verificationAddress, owner, implementation } = input

        const initCodeParams = {
            salt, _entryPointAddr: entryPointAddress, _userAuthAddr: verificationAddress, _owner: owner
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