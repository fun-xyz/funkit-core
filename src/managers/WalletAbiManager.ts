import { constants } from "ethers"
import { verifyFunctionParams, verifyIsArray } from "../utils/DataUtils"
import { verifyValidParamsFromAbi, checkAbi, encodeContractCall } from "../utils/ChainUtils"
import { Interface, hexConcat } from "ethers/lib/utils"

const encodeCallExpectedKeys = ["to", "data"]
const initCodeExpectedKeys = ["uniqueId", "entryPointAddress", "factoryAddress", "verificationAddress", "owner"]
const encodeFeeCallExpectedKeys = ["to", "data", "token", "amount", "recipient"]

export class WalletAbiManager {
    walletInterface: Interface
    factoryInterface: Interface

    constructor(walletAbi: any, factoryAbi: any) {
        const errorLocation = "WalletAbiManager constructor"
        this.walletInterface = checkAbi(walletAbi, "FunWallet", errorLocation, true)
        this.factoryInterface = checkAbi(factoryAbi, "FunWalletFactory", errorLocation, true)
    }

    encodeCall(input: any, location = "WalletAbiManager.encodeCall") {
        if (input.token) {
            return this.encodeFeeCall(input)
        }
        verifyFunctionParams(location, input, encodeCallExpectedKeys)
        const { to: dest } = input
        let { data, value } = input
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

    encodeFeeCall(input: any, location = "WalletAbiManager.encodeFeeCall") {
        verifyFunctionParams(location, input, encodeFeeCallExpectedKeys)
        const { to: dest, token, amount, recipient, oracle } = input
        let { data, value } = input
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

    encodeInitExecCall(input: any, location = "WalletAbiManager.encodeInitExecCall", isInternal = false) {
        if (input.token) {
            return this.encodeInitExecFeeCall(input)
        }
        verifyFunctionParams(location, input, encodeCallExpectedKeys)
        const { to: dest, data } = input
        let { value } = input
        verifyIsArray(data, location)
        if (value) {
            verifyIsArray(value, location)
        } else {
            value = [0, 0]
        }
        const encodeObj = { dest, data, value }
        return encodeContractCall(this.walletInterface, "initAndExec", encodeObj, location, isInternal)
    }

    encodeInitExecFeeCall(input: any, location = "WalletAbiManager.encodeInitExecFeeCall", isInternal = false) {
        verifyFunctionParams(location, input, encodeFeeCallExpectedKeys)
        const { to: dest, data, token, amount, recipient } = input
        let { value } = input
        verifyIsArray(data, location)
        if (value) {
            verifyIsArray(value, location)
        } else {
            value = [0, 0]
        }
        const feedata = [token, recipient, amount]
        const encodeObj = { dest, data, value, feedata }
        return encodeContractCall(this.walletInterface, "initAndExec", encodeObj, location, isInternal)
    }

    encodeWalletCall(encodeFunctionName: string, input: any, location = "WalletAbiManager.encodeWalletCall", isInternal = false) {
        return encodeContractCall(this.walletInterface, encodeFunctionName, input, location, isInternal)
    }

    encodeFactoryCall(encodeFunctionName: string, input: any, location = "WalletAbiManager.encodeFactoryCall", isInternal = false) {
        return encodeContractCall(this.factoryInterface, encodeFunctionName, input, location, isInternal)
    }

    getInitCode(input: any) {
        verifyFunctionParams("WalletAbiManager.getInitCode", input, initCodeExpectedKeys)

        const { uniqueId, entryPointAddress, verificationAddress, owner, implementation } = input

        const initCodeParams: any = {
            salt: uniqueId,
            _entryPointAddr: entryPointAddress,
            _userAuthAddr: verificationAddress,
            _owner: owner,
            implementation: implementation ? implementation : constants.AddressZero
        }

        verifyValidParamsFromAbi(this.walletInterface.fragments, "initialize", initCodeParams, "WalletAbiManager.getInitCode")
        initCodeParams.initializerCallData = this.encodeWalletCall("initialize", initCodeParams)
        verifyValidParamsFromAbi(this.factoryInterface.fragments, "createAccount", initCodeParams, "WalletAbiManager.getInitCode")
        const data = this.encodeFactoryCall("createAccount", initCodeParams, "WalletAbiManager.getInitCode")
        return hexConcat([input.factoryAddress, data])
    }
}
