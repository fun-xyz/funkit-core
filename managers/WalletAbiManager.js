const { constants, ethers, BigNumber } = require("ethers")
const { Interface } = require("ethers/lib/utils")
const { Helper, DataFormatError } = require("../errors")
const { verifyValidParametersForLocation, verifyValidParamsFromAbi, checkAbi, encodeContractCall } = require("../utils")


const encodeCallExpectedKeys = ["to", "calldata"]
// const initCodeExpectedKeys = ["salt", "_entryPointAddr", "_userAuthAddr", "_owner"]
const initCodeExpectedKeys = ["salt", "entryPointAddress", "verificationAddress", "owner"]

class WalletAbiManager {
    constructor(walletAbi, factoryAbi) {
        const errorLocation = "WalletAbiManager constructor"
        this.walletInterface = checkAbi(walletAbi, "FunWallet", errorLocation, true)
        this.factoryInterface = checkAbi(factoryAbi, "FunWalletFactory", errorLocation, true)
    }

    encodeCall(input) {
        verifyValidParametersForLocation("WalletAbiManager.encodeCall", input, encodeCallExpectedKeys)
        let { to: dest, calldata: data, value } = input
        value = value ? value : 0
        const encodeObj = { dest, data, value }
        return this.encodeWalletCall("execFromEntryPointOrOwner", encodeObj)
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
        }

        verifyValidParamsFromAbi(this.walletInterface.fragments, "initialize", initCodeParams, "WalletAbiManager.getInitCode")
        initCodeParams.initializerCallData = this.encodeWalletCall("initialize", initCodeParams)

        verifyValidParamsFromAbi(this.factoryInterface.fragments, "createAccount", initCodeParams, "WalletAbiManager.getInitCode")
        return this.encodeFactoryCall("createAccount", initCodeParams, "WalletAbiManager.getInitCode")
    }

}



const walletAbi = require("../abis/FunWallet.json").abi
const factoryAbi = require("../abis/FunWalletFactory.json").abi
const manager = new WalletAbiManager(walletAbi, factoryAbi)

const initcodeParams = {
    salt: constants.HashZero,
    entryPointAddress: constants.AddressZero,
    verificationAddress: constants.AddressZero,
    owner: constants.AddressZero
}

const encodeCallParams = {
    to: constants.AddressZero,
    calldata: "0x",
}


console.log(manager.getInitCode(initcodeParams), "\n");
console.log(manager.encodeCall(encodeCallParams))


module.exports = { WalletAbiManager }