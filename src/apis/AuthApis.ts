import { API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/Api"

export async function setAuth(authId: string, method: string, addr: string, uniqueId: string) {
    await sendPostRequest(API_URL, "auth/set-auth", {
        authId,
        method,
        addr,
        uniqueId
    })
}

export async function getAuth(authId: string): Promise<any> {
    return await sendPostRequest(API_URL, "auth/get-auth", {
        authId
    })
}
