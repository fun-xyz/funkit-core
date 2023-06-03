import { constants } from "ethers"
import { Interface, defaultAbiCoder, hexConcat } from "ethers/lib/utils"
import { FactoryCreateAccountParams, InitCodeParams, WalletInitialzeParams, encodeLoginData } from "../data"
import { checkAbi, encodeContractCall, verifyValidParamsFromAbi } from "../utils/ChainUtils"
import { verifyFunctionParams, verifyIsArray } from "../utils/DataUtils"

const encodeCallExpectedKeys = ["to", "data"]
const encodeFeeCallExpectedKeys = ["to", "data", "token", "amount", "recipient"]
const callFunctionName = "execFromEntryPoint"
const feeCallFunctionName = "execFromEntryPointWithFee"

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
        return this.encodeWalletCall(callFunctionName, encodeObj)
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
        return this.encodeWalletCall(feeCallFunctionName, encodeObj)
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

    getInitCode(input: InitCodeParams) {
        const walletInitialzeParams: WalletInitialzeParams = {
            _newEntryPoint: input.entryPointAddress,
            validationInitData: defaultAbiCoder.encode(["address[]", "bytes[]"], [input.verificationAddresses, input.verificationData])
        }

        verifyValidParamsFromAbi(this.walletInterface.fragments, "initialize", walletInitialzeParams, "WalletAbiManager.getInitCode")
        const factoryCreateAccountParams: FactoryCreateAccountParams = {
            initializerCallData: this.encodeWalletCall("initialize", walletInitialzeParams),
            implementation: input.implementationAddress ? input.implementationAddress : constants.AddressZero,
            data: encodeLoginData(input.loginData)
        }

        verifyValidParamsFromAbi(
            this.factoryInterface.fragments,
            "createAccount",
            factoryCreateAccountParams,
            "WalletAbiManager.getInitCode"
        )
        const data = this.encodeFactoryCall("createAccount", factoryCreateAccountParams, "WalletAbiManager.getInitCode")
        return hexConcat([input.factoryAddress, data])
    }
}
