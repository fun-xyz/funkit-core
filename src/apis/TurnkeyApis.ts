import { API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/ApiUtils"

export async function createSubOrg(createSubOrgRequest: any): Promise<string> {
    const res = await sendPostRequest(API_URL, "turnkey/createSubOrg", createSubOrgRequest)
    return res
}

export async function createPrivateKey(signedRequest: any): Promise<any> {
    const res = await sendPostRequest(API_URL, "turnkey/createPrivateKey", signedRequest)
    console.log("CORE", res)
    return {
        id: res.id,
        address: res.address
    }
}
