import { retry } from "@lifeomic/attempt"
import fetch from "node-fetch"
import { API_URL } from "../common/constants"

export const DEFAULT_RETRY_OPTIONS = {
    delay: 100,
    initialDelay: 0,
    maxDelay: 3000,
    factor: 2,
    maxAttempts: 5,
    timeout: 0,
    jitter: true,
    minDelay: 0,
    handleError: null,
    handleTimeout: null,
    beforeAttempt: null,
    calculateDelay: null
}

export const sendRequest = async (uri: string, method: string, apiKey: string, body?: object) => {
    try {
        return retry(async function () {
            return await fetch(uri, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "X-Api-Key": apiKey
                },
                redirect: "follow",
                body: JSON.stringify(body)
            }).then((r) => r.json())
        }, DEFAULT_RETRY_OPTIONS)
    } catch (e) {
        console.log(e)
    }
}

export async function sendGetRequest(uri: string = API_URL, endpoint: string, apiKey: string = globalEnvOption.apiKey!): Promise<any> {
    return await sendRequest(`${uri}/${endpoint}`, "GET", apiKey)
}

export async function sendPostRequest(uri: string = API_URL, endpoint: string, body: object): Promise<any> {
    return await sendRequest(`${uri}/${endpoint}`, "POST", globalEnvOption.apiKey!, body)
}
