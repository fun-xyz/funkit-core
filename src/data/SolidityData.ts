import { Address, Hex, encodeAbiParameters } from "viem"
import { LoginData, WalletSignature } from "./types"
import { AddressZero, HashZero } from "../common"

export function encodeLoginData(data: LoginData): Hex {
    let { loginType, newFunWalletOwner, index, socialHandle, salt } = data
    newFunWalletOwner = newFunWalletOwner ? newFunWalletOwner : AddressZero
    index = index ? BigInt(index) : 0n
    socialHandle = socialHandle ? socialHandle : "0x"
    salt = salt ? salt : HashZero
    loginType = loginType ? loginType : 0
    //(uint8,address,bytes32,uint256,bytes)
    return encodeAbiParameters(
        [
            {
                type: "tuple",
                components: [{ type: "uint8" }, { type: "address" }, { type: "bytes32" }, { type: "uint256" }, { type: "bytes" }]
            }
        ],
        [[loginType, newFunWalletOwner, salt, index, socialHandle]]
    )
}

export function encodeWalletSignature(data: WalletSignature): Hex {
    const { userId, signature } = data
    let { authType, extraData } = data
    authType = authType ? authType : 0
    extraData = extraData ? extraData : "0x"
    return encodeAbiParameters(
        [{ type: "uint8" }, { type: "address" }, { type: "bytes" }, { type: "bytes" }],
        [authType, userId, signature, extraData]
    )
}
export function addresstoBytes32(data: Address): Hex {
    return encodeAbiParameters([{ type: "address" }], [data])
}
export function toBytes32Arr(data: Hex[]): Hex {
    return encodeAbiParameters([{ type: "bytes32[]" }], [data])
}
