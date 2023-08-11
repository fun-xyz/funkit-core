import { Hex, encodeAbiParameters, keccak256, parseAbiParameters } from "viem"
import { SocialHandleCommitParams } from "./types"
import { TransactionParams, WALLET_INIT_CONTRACT_INTERFACE } from "../common"
import { Chain } from "../data"

export const commitTransactionParams = async (params: SocialHandleCommitParams): Promise<TransactionParams> => {
    const { socialHandle, seed, owner, initializerCallData } = params
    const chain = await Chain.getChain({ chainIdentifier: params.chainId.toString() })
    const walletInitAddress = await chain.getAddress("walletInitAddress")
    const loginType = 1
    const encodedCommitKey = encodeAbiParameters(parseAbiParameters("bytes, uint8"), [socialHandle, loginType])
    const commitKey: Hex = keccak256(encodedCommitKey)
    const encodedHash = encodeAbiParameters(parseAbiParameters("bytes, address, bytes"), [seed, owner, initializerCallData])
    const hash: Hex = keccak256(encodedHash)
    return WALLET_INIT_CONTRACT_INTERFACE.encodeTransactionParams(walletInitAddress, "commit", [commitKey, hash])
}
