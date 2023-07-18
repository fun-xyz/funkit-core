import { v4 as uuidv4 } from "uuid"
import { Address, Hex, keccak256, toBytes } from "viem"
import { AddressZero, FACTORY_CONTRACT_INTERFACE, TransactionParams, WALLET_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { AuthType, Chain, Operation, Token, UserOperation, encodeLoginData } from "../data"
import { Helper, ParameterFormatError } from "../errors"

export const generateRandomBytes32 = (): Hex => {
    return keccak256(toBytes(uuidv4())) as Hex
}

export const generateRandomWalletUniqueId = (): Hex => {
    return generateRandomBytes32()
}

export const generateRandomGroupId = (): Hex => {
    return generateRandomBytes32()
}

export const getWalletAddress = async (chain: Chain, walletUniqueId: Hex): Promise<Address> => {
    const data = encodeLoginData({ salt: walletUniqueId })
    const factoryAddress = await chain.getAddress("factoryAddress")
    return await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "getAddress", [data], chain)
}

export const isWalletInitOp = (userOp: UserOperation): boolean => {
    return userOp.initCode !== "0x"
}

export const isGroupOperation = (operation: Operation): boolean => {
    if (operation.groupId && operation.authType === AuthType.MULTI_SIG) {
        return true
    }
    return false
}

/**
 * Encodes arbitrary transactions calls to include fees
 * @param params Transaction Params, generated from various calldata generating functions
 * @param options EnvOptions to read fee data from
 * @returns calldata to be passed into createUserOperation
 */
export const execFromEntryPoint = async (params: TransactionParams, options: EnvOption): Promise<Hex> => {
    if (options.fee) {
        if (!options.fee.token && options.gasSponsor && options.gasSponsor.token) {
            options.fee.token = options.gasSponsor.token
        }
        if (!options.fee.token) {
            const helper = new Helper("Fee", options.fee, "EnvOption.fee.token or EnvOption.gasSponsor.token is required")
            throw new ParameterFormatError("Wallet.execFromEntryPoint", helper)
        }
        const token = new Token(options.fee.token)
        if (token.isNative) {
            options.fee.token = AddressZero
        } else {
            options.fee.token = await token.getAddress()
        }

        if (options.fee.amount) {
            options.fee.amount = Number(await token.getDecimalAmount(options.fee.amount))
        } else if (options.fee.gasPercent) {
            if (!token.isNative) {
                const helper = new Helper("Fee", options.fee, "gasPercent is only valid for native tokens")
                throw new ParameterFormatError("Wallet.execFromEntryPoint", helper)
            }
            // const estimateGasOptions = { ...options, fee: undefined }

            options.fee.amount = options.fee.gasPercent / 100
        } else {
            const helper = new Helper("Fee", options.fee, "fee.amount or fee.gasPercent is required")
            throw new ParameterFormatError("Wallet.execFromEntryPoint", helper)
        }
        const feedata = [token, options.fee.recipient, options.fee.amount]
        return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPointWithFee", [params.to, params.value, params.data, feedata])
    } else {
        return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, params.value, params.data])
    }
}
