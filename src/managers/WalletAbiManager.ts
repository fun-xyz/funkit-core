import { concat, encodeAbiParameters } from "viem"
import { AddressZero, TransactionDataWithFee, factoryContractInterface, walletContractInterface } from "../common"
import { InitCodeParams, encodeLoginData } from "../data"
import { verifyFunctionParams } from "../utils/DataUtils"

const encodeCallExpectedKeys = ["to", "data"]
const encodeFeeCallExpectedKeys = ["to", "data", "token", "amount", "recipient"]
const callFunctionName = "execFromEntryPoint"
const feeCallFunctionName = "execFromEntryPointWithFee"

export class WalletAbiManager {
    encodeCall(input: TransactionDataWithFee, location = "WalletAbiManager.encodeCall") {
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

        return walletContractInterface.encodeData(callFunctionName, [dest, value, data])
    }

    encodeFeeCall(input: TransactionDataWithFee, location = "WalletAbiManager.encodeFeeCall") {
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
        return walletContractInterface.encodeData(feeCallFunctionName, [dest, value, data, feedata])
    }

    getInitCode(input: InitCodeParams) {
        const encodedVerificationInitdata = encodeAbiParameters(
            [
                {
                    type: "address[]",
                    name: "verificationAddresses"
                },
                {
                    type: "bytes[]",
                    name: "verificationData"
                }
            ],
            [input.verificationAddresses, input.verificationData]
        )
        const initializerCallData = walletContractInterface.encodeData("initialize", [input.entryPointAddress, encodedVerificationInitdata])

        const implementationAddress = input.implementationAddress ? input.implementationAddress : AddressZero

        const data = factoryContractInterface.encodeData("createAccount", [
            initializerCallData,
            implementationAddress,
            encodeLoginData(input.loginData)
        ])
        return concat([input.factoryAddress, data])
    }
}
