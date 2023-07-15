import { Address, Hex, encodeAbiParameters } from "viem"
import { ExtraDataType, LoginData, WalletSignature } from "./types"
import { AddressZero, HashZero } from "../common"
import { User } from "../wallet/types"

const extraDataStructType = {
    type: "tuple",
    components: [{ type: "bytes32[]" }, { type: "bytes32[]" }, { type: "bytes32[]" }, { type: "bytes32[]" }]
}

const walletSigEncodingTypes = [
    { type: "uint8" },
    { type: "bytes32" },
    { type: "bytes32" },
    { type: "bytes32" },
    { type: "bytes" },
    extraDataStructType
]
export function encodeLoginData(data: LoginData): Hex {
    let { loginType, newFunWalletOwner, index, socialHandle, salt } = data
    newFunWalletOwner = newFunWalletOwner ? newFunWalletOwner : AddressZero
    index = index ? BigInt(index) : 0n
    socialHandle = socialHandle ? socialHandle : "0x"
    salt = salt ? salt : HashZero
    loginType = loginType ? loginType : 0
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

const parseExtraData = (data: ExtraDataType): Hex[][] => {
    let { targetPath, selectorPath, feeRecipientPath, tokenPath } = data
    targetPath ??= []
    selectorPath ??= []
    feeRecipientPath ??= []
    tokenPath ??= []
    return [targetPath, selectorPath, feeRecipientPath, tokenPath]
}

export function encodeWalletSignature(data: WalletSignature): Hex {
    const { userId, signature, extraData } = data
    let { authType, roleId, ruleId } = data
    roleId ??= HashZero
    ruleId ??= HashZero
    authType ??= 0
    const extraDataEncoded: Hex[][] = extraData ? parseExtraData(extraData) : [[], [], [], []]
    return encodeAbiParameters(walletSigEncodingTypes, [authType, userId, roleId, ruleId, signature, extraDataEncoded])
}

export function encodeUserAuthInitData(groupUsers: User[]): Hex {
    const groupIds: Hex[] = []
    const groupInfos: [Hex[], number][] = []
    groupUsers.forEach((user) => {
        groupIds.push(user.userId)
        groupInfos.push([user.groupInfo!.memberIds, user.groupInfo!.threshold])
    })
    return encodeAbiParameters([{ type: "bytes32[]" }, { type: "tuple(bytes32[],uint256)[]" }], [groupIds, groupInfos])
}

export function addresstoBytes32(data: Address): Hex {
    return encodeAbiParameters([{ type: "address" }], [data])
}

export function toBytes32Arr(data: Hex[]): Hex {
    return encodeAbiParameters([{ type: "bytes32[]" }], [data])
}
