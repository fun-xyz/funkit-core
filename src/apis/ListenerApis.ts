import { Address } from "viem"
import { API_URL } from "../common/constants"
import { Helper, InternalFailureError } from "../errors"
import { sendPostRequest } from "../utils/ApiUtils"

export async function createListener(walletAddresses: Address[], chains: string[], webhookUrl: string): Promise<void> {
    const body = {
        walletAddresses,
        chains,
        webhookUrl
    }
    const result = await sendPostRequest(API_URL, "listeners/create", body).then((r) => {
        return r.success
    })
    if (!result) {
        const helper = new Helper("Calling createListener", "POST", "Empty data returned")
        throw new InternalFailureError("listenerApis.createListener", "Listener call failed.", helper, true)
    }
    return result
}

export async function deleteListener(walletAddress: Address, chain: string[]): Promise<void> {
    const body = {
        walletAddress,
        chain
    }
    const result = await sendPostRequest(API_URL, "listeners/delete", body).then((r) => {
        return r.success
    })
    if (!result) {
        const helper = new Helper("Calling deleteListener", "POST", "Empty data returned")
        throw new InternalFailureError("listenerApis.deleteListener", "Listener call failed.", helper, true)
    }
    return result
}
