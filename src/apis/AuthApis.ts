import { API_URL } from "../common/constants"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function setAuth(authId: string, method: string, addr: string, uniqueId: string) {
    return await sendPostRequest(API_URL, "auth/", {
        authId,
        method,
        addr,
        uniqueId
    })
}

export async function getAuth(authId: string): Promise<any> {
    return await sendGetRequest(API_URL, `auth/${authId}`)
}

// To be migrated or deprecated
export async function setGroupById(uniqueId: string, userIds: string[], requiredSignatures: number) {
    return await sendPostRequest(API_URL, "groups", {
        userIds,
        uniqueId,
        requiredSignatures
    })
}

export async function getGroupById(uniqueId: string) {
    return await sendGetRequest(API_URL, `groups/${uniqueId}`).then((r: any) => {
        if (!r.data) {
            throw new Error(JSON.stringify(r))
        }
        return r.data
    })
}
