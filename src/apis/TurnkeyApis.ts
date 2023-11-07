import { TPrivateKeyState } from "./types"
import { API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/ApiUtils"

export async function createTurnkeySubOrg(createSubOrgRequest: object): Promise<string> {
    const res = await sendPostRequest(API_URL, "turnkey/sub-org", createSubOrgRequest)
    return res
}

export async function createTurnkeyPrivateKey(signedRequest: object): Promise<TPrivateKeyState> {
    const res = await sendPostRequest(API_URL, "turnkey/private-key", signedRequest)
    return {
        id: res.id,
        address: res.address
    }
}
