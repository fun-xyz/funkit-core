import { Address, Hex } from "viem"

export interface ChainInput {
    chainId?: string
    rpcUrl?: string
    chainName?: string
    bundlerUrl?: string
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
    signature: Hex
    extraData?: Hex
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
