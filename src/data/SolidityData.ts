import { constants } from "ethers"
import { defaultAbiCoder } from "ethers/lib/utils"
import { LoginData, WalletSignature } from "./types"

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
