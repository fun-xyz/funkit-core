import { Address } from "viem"
import { API_URL } from "../common/constants"
import { ErrorCode, InternalFailureError } from "../errors"
import { sendPostRequest } from "../utils/ApiUtils"

export async function createListener(walletAddresses: Address[], chains: string[], webhookUrl: string): Promise<void> {
    const body = {
        walletAddresses,
        chains,
        webhookUrl
    }
    const result = await sendPostRequest(API_URL, "listeners/", body).then((r) => {
        return r
    })
    if (!result) {
        throw new InternalFailureError(
            ErrorCode.UnknownServerError,
            "Listener call failed.",
            { walletAddresses, chains, webhookUrl },
            "This is an internal error, please contact support.",
            "https://docs.fun.xyz"
        )
    }
    return result
}

export async function deleteListener(walletAddress: Address, chain: string): Promise<void> {
    const body = {
        walletAddress,
        chain
    }
    const result = await sendPostRequest(API_URL, "listeners/delete", body).then((r) => {
        return r
    })
    if (!result) {
        throw new InternalFailureError(
            ErrorCode.UnknownServerError,
            "Listener call failed.",
            { walletAddress, chain },
            "This is an internal error, please contact support.",
            "https://docs.fun.xyz"
        )
    }
    return result
}
