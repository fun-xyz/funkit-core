import { retry } from "@lifeomic/attempt"
import fetch from "node-fetch"
import { stringifyOp } from "./UseropUtils"
import { API_URL } from "../common/constants"
import { Helper, InternalFailureError, InvalidParameterError, NoServerConnectionError, ServerMissingDataError } from "../errors"

const errorHandler = (err: any, context: any) => {
    if (err instanceof ServerMissingDataError || err instanceof InvalidParameterError) {
        context.abort()
    }
}

export const DEFAULT_RETRY_OPTIONS = {
    delay: 100,
    initialDelay: 0,
    maxDelay: 3000,
    factor: 2,
    maxAttempts: 5,
    timeout: 0,
    jitter: true,
    minDelay: 0,
    handleError: errorHandler,
    handleTimeout: null,
    beforeAttempt: null,
    calculateDelay: null
}

export const sendRequest = async (uri: string, method: string, apiKey: string, body?: object) => {
    try {
        const headers = {
            "Content-Type": "application/json"
        }
        if (apiKey) {
            headers["X-Api-Key"] = apiKey
        }
        return retry(async function () {
            const response = await fetch(uri, {
                method,
                headers,
                redirect: "follow",
                body: method !== "GET" ? stringifyOp(body) : undefined
            })
            const text = await response.text()

            if (response.status === 404) {
                const helper = new Helper(`Calling ${uri}`, method, "Data not found on server.")
                throw new ServerMissingDataError("sendRequest.ApiUtils", `HTTP error! status: ${response.status}`, helper, true)
            } else if (response.status === 400) {
                const helper = new Helper(`Calling ${uri}`, method, "Bad Request.")
                throw new InvalidParameterError("sendRequest.ApiUtils", `HTTP error! status: ${response.status}`, helper, true)
            } else if (response.status === 500) {
                const helper = new Helper(`Calling ${uri}`, method, text)
                throw new InternalFailureError("sendRequest.ApiUtils", `HTTP error! status: ${response.status}`, helper, true)
            } else if (!response.ok) {
                const helper = new Helper(`Calling ${uri}`, method, "Unknown Error.")
                throw new NoServerConnectionError("sendRequest.ApiUtils", `HTTP error! status: ${response.status}`, helper, true)
            }

            if (text) {
                return JSON.parse(text)
            } else {
                return {}
            }
        }, DEFAULT_RETRY_OPTIONS)
    } catch (err) {
        const helper = new Helper(`Calling ${uri}`, method, "Cannot connect to Fun API Server.")
        throw new NoServerConnectionError("sendRequest.ApiUtils", `Error: ${err}`, helper, true)
    }
}

export async function sendGetRequest(
    uri: string = API_URL,
    endpoint: string,
    apiKey: string = (globalThis as any).globalEnvOption.apiKey!
): Promise<any> {
    return await sendRequest(`${uri}/${endpoint}`, "GET", apiKey)
}

export async function sendPostRequest(
    uri: string = API_URL,
    endpoint: string,
    body: object,
    apiKey: string = (globalThis as any).globalEnvOption.apiKey!
): Promise<any> {
    return await sendRequest(`${uri}/${endpoint}`, "POST", apiKey, body)
}

export async function sendDeleteRequest(
    uri: string = API_URL,
    endpoint: string,
    apiKey: string = (globalThis as any).globalEnvOption.apiKey!
): Promise<void> {
    await sendRequest(`${uri}/${endpoint}`, "DELETE", apiKey)
}

export async function sendPutRequest(
    uri: string = API_URL,
    endpoint: string,
    body: object,
    apiKey: string = (globalThis as any).globalEnvOption.apiKey!
): Promise<void> {
    await sendRequest(`${uri}/${endpoint}`, "PUT", apiKey, body)
}
