import { constants } from "ethers"
import { defaultAbiCoder } from "ethers/lib/utils"

type FactoryCreateAccountParams = {
    initializerCallData: string
    implementation: string
    data: string
}

type InitCodeParams = {
    entryPointAddress: string
    factoryAddress: string
    implementationAddress?: string
    loginData: LoginData
    verificationData: string[]
    verificationAddresses: string[]
}

/**
 * @param loginType 0 = EOA, 1 = Twitter
 * @param newFunWalletOwner *social login* Address of the new FunWallet owner, used to stop frontrunning
 * @param index *social login* Hashed with socialHandle and loginType to generate salt
 * @param socialHandle *social login*
 * @param salt *EOA login* Hashed with loginType to generate salt
 */

type LoginData = {
    loginType?: number
    newFunWalletOwner?: string
    index?: number
    socialHandle?: string
    salt?: string
}

type WalletInitialzeParams = {
    _newEntryPoint: string
    validationInitData: string
}

type WalletSignature = {
    authType?: number
    userId: string
    signature: string
    extraData?: string
}

type CallInfo = {
    to: string
    data?: string | "0x"
    value?: number | 0
}
export function encodeLoginData(data: LoginData): string {
    let { loginType, newFunWalletOwner, index, socialHandle, salt } = data
    newFunWalletOwner = newFunWalletOwner ? newFunWalletOwner : constants.AddressZero
    index = index ? index : 0
    socialHandle = socialHandle ? socialHandle : "0x"
    salt = salt ? salt : constants.HashZero
    loginType = loginType ? loginType : 0
    return defaultAbiCoder.encode(
        ["tuple(uint8,address,bytes32,uint256,bytes)"],
        [[loginType, newFunWalletOwner, salt, index, socialHandle]]
    )
}

export function encodeWalletSignature(data: WalletSignature): string {
    const { userId, signature } = data
    let { authType, extraData } = data
    authType = authType ? authType : 0
    extraData = extraData ? extraData : "0x"
    return defaultAbiCoder.encode(["uint8", "address", "bytes", "bytes"], [authType, userId, signature, extraData])
}
export function addresstoBytes32(data: string): string {
    return defaultAbiCoder.encode(["address"], [data])
}
export function toBytes32Arr(data: string[]): string {
    return defaultAbiCoder.encode(["bytes32[]"], [data])
}

export { FactoryCreateAccountParams, InitCodeParams, LoginData, WalletInitialzeParams, WalletSignature, CallInfo }
