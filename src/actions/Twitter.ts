import { Hex, encodeAbiParameters, keccak256, parseAbiParameters } from "viem"
import { CommitParams } from "./types"
import { TransactionParams, WALLET_INIT_CONTRACT_INTERFACE } from "../common"
import { Chain } from "../data"

export const commitTransactionParams = async (params: CommitParams): Promise<Promise<TransactionParams>> => {
    const { socialHandle, index, seed, owner, initializerCallData } = params
    const chain = await Chain.getChain({ chainIdentifier: params.chainId.toString() })
    const walletInitAddress = await chain.getAddress("walletInitAddress")
    const loginType = 1
    const encodedCommitKey = encodeAbiParameters(parseAbiParameters("bytes, uint256, uint8"), [socialHandle, index, loginType])
    const commitKey: Hex = keccak256(encodedCommitKey)
    const encodedHash = encodeAbiParameters(parseAbiParameters("bytes, address, bytes"), [seed, owner, initializerCallData])
    const hash: Hex = keccak256(encodedHash)
    return WALLET_INIT_CONTRACT_INTERFACE.encodeTransactionParams(walletInitAddress, "commit", [commitKey, hash])
}
