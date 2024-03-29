import { Address, Hex } from "viem"
import { Chain } from "./Chain"

export interface ChainInput {
    chainIdentifier?: string | Chain | number
    rpcUrl?: string
}

export type FactoryCreateAccountParams = {
    initializerCallData: string
    implementation: string
    data: string
}

export type InitCodeParams = {
    entryPointAddress: Address
    factoryAddress: Address
    implementationAddress?: Address
    loginData: LoginData
    verificationData: readonly Hex[]
    verificationAddresses: readonly Address[]
}

export type Addresses = {
    [key: string]: Address
}

/**
 * @param loginType 0 = EOA, 1 = Twitter
 * @param newFunWalletOwner *social login* Address of the new FunWallet owner, used to stop frontrunning
 * @param index *social login* Hashed with socialHandle and loginType to generate salt
 * @param socialHandle *social login*
 * @param salt *EOA login* Hashed with loginType to generate salt
 */

export type LoginData = {
    loginType?: number
    newFunWalletOwner?: Hex
    index?: number | bigint
    socialHandle?: Hex
    salt?: Hex
}

export type WalletInitialzeParams = {
    _newEntryPoint: string
    validationInitData: string
}

export type WalletSignature = {
    authType?: number
    userId: Hex
    roleId?: Hex
    ruleId?: Hex
    signature: Hex
    extraData?: ExtraDataType
}

export type ExtraDataType = {
    targetPath?: Hex[]
    selectorPath?: Hex[]
    feeRecipientPath?: Hex[]
    tokenPath?: Hex[]
}

export type UserOperation = {
    sender: string
    nonce: bigint
    initCode?: string
    callData: string
    callGasLimit: bigint
    verificationGasLimit: bigint
    preVerificationGas?: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    paymasterAndData?: string
    signature?: string
}

export enum AuthType {
    ECDSA = 0,
    MULTI_SIG = 1
}

export type Signature = {
    userId: Hex
    signature: Hex
    signedTime: number
}

export enum OperationType {
    SINGLE_OPERATION = "SINGLE_OPERATION",
    GROUP_OPERATION = "GROUP_OPERATION",
    REJECTION = "REJECTION"
}

export enum OperationStatus {
    ALL = "",
    PENDING_APPROVED = "PENDING_APPROVED",
    APPROVED = "APPROVED",
    PENDING = "PENDING",
    OP_SUCCEED = "OP_SUCCEED",
    OP_REVERTED = "OP_REVERTED",
    SCHEDULED = "SCHEDULED"
}

export type OperationMetadata = {
    opId?: Hex
    chainId: string
    opType: OperationType
    authType: AuthType
    groupId?: Hex
    message?: string
    walletAddr: Address
    status?: OperationStatus
    proposer: string // do not use address in case we later use non-address data as the proposer
    proposedTime?: number
    executedBy?: string
    executedTime?: number
    relatedOpIds?: Hex[]
    signatures?: Signature[]
    txid?: string
    gasUsed?: string
    opFeeUSD?: string
    opFee?: string
    executedBlockNumber?: number
    executedBlockTimeStamp?: number
}
