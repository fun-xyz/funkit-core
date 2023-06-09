import { concat, encodeAbiParameters } from "viem"
import { AddressZero, FACTORY_CONTRACT_INTERFACE, TransactionDataWithFee, WALLET_CONTRACT_INTERFACE } from "../common"
import { InitCodeParams, encodeLoginData } from "../data"
import { verifyFunctionParams } from "../utils/DataUtils"

const encodeCallExpectedKeys = ["to"]
const encodeFeeCallExpectedKeys = ["to", "token", "amount", "recipient"]
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
        value ??= 0
        data ??= "0x"

        return WALLET_CONTRACT_INTERFACE.encodeData(callFunctionName, [dest, value, data])
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
        return WALLET_CONTRACT_INTERFACE.encodeData(feeCallFunctionName, [dest, value, data, feedata])
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
        const initializerCallData = WALLET_CONTRACT_INTERFACE.encodeData("initialize", [
            input.entryPointAddress,
            encodedVerificationInitdata
        ])

        const implementationAddress = input.implementationAddress ? input.implementationAddress : AddressZero

        const data = FACTORY_CONTRACT_INTERFACE.encodeData("createAccount", [
            initializerCallData,
            implementationAddress,
            encodeLoginData(input.loginData)
        ])
        return concat([input.factoryAddress, data])
    }
}
