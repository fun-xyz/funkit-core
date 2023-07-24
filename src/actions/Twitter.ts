import { Hex, encodeAbiParameters, keccak256, parseAbiParameters } from "viem"
import { CommitParams } from "./types"
import { TransactionParams, WALLET_INIT_CONTRACT_INTERFACE } from "../common"
export const commitTransactionParams = (params: CommitParams): TransactionParams => {
    const { socialHandle, index, seed, owner, initializerCallData, walletInitAddress } = params
    const loginType = 1
    const encodedCommitKey = encodeAbiParameters(parseAbiParameters("bytes, uint256, uint8"), [socialHandle, index, loginType])
    const commitKey: Hex = keccak256(encodedCommitKey)
    const encodedHash = encodeAbiParameters(parseAbiParameters("bytes, address, bytes"), [seed, owner, initializerCallData])
    const hash: Hex = keccak256(encodedHash)
    return WALLET_INIT_CONTRACT_INTERFACE.encodeTransactionParams(walletInitAddress, "commit", [commitKey, hash])
}
