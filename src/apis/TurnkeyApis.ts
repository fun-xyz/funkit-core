import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

export async function createSubOrg(createSubOrgRequest: any): Promise<string> {
    const params = new URLSearchParams({
        createSubOrgRequest
    }).toString()
    const res = await sendGetRequest(API_URL, `turnkey/createSubOrg/?${params}`)
    return res.newSubOrgId
}

export async function createPrivateKey(signedRequest: any): Promise<any> {
    const params = new URLSearchParams({
        signedRequest
    }).toString()
    const res = await sendGetRequest(API_URL, `turnkey/createPrivateKey/?${params}`)
    return {
        id: res.id,
        address: res.address
    }
}
