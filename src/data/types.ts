import { BigNumberish } from "ethers"

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
    entryPointAddress: string
    factoryAddress: string
    implementationAddress?: string
    loginData: LoginData
    verificationData: string[]
    verificationAddresses: string[]
}

export type Addresses = {
    [key: string]: string
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
    newFunWalletOwner?: string
    index?: number
    socialHandle?: string
    salt?: string
}

export type WalletInitialzeParams = {
    _newEntryPoint: string
    validationInitData: string
}

export type WalletSignature = {
    authType?: number
    userId: string
    signature: string
    extraData?: string
}

export type UserOperation = {
    sender: string
    nonce: BigNumberish
    initCode?: string
    callData: string
    callGasLimit: BigNumberish
    verificationGasLimit: BigNumberish
    preVerificationGas?: BigNumberish
    maxFeePerGas: BigNumberish
    maxPriorityFeePerGas: BigNumberish
    paymasterAndData?: string
    signature?: string
}
