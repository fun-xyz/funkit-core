import { API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/ApiUtils"

export async function createTurnkeySubOrg(createSubOrgRequest: object): Promise<string> {
    const res = await sendPostRequest(API_URL, "turnkey/createSubOrg", createSubOrgRequest)
    return res
}

export async function createTurnkeyPrivateKey(signedRequest: object): Promise<any> {
    const res = await sendPostRequest(API_URL, "turnkey/createPrivateKey", signedRequest)
    return {
        id: res.id,
        address: res.address
    }
}
