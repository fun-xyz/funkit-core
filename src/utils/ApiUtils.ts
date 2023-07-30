import { retry } from "@lifeomic/attempt"
import fetch from "node-fetch"
import { stringifyOp } from "./UserOpUtils"
import { API_URL } from "../common/constants"
import { ErrorCode, InternalFailureError, InvalidParameterError, ResourceNotFoundError } from "../errors"

const errorHandler = (err: any, context: any) => {
    if (err instanceof ResourceNotFoundError || err instanceof InvalidParameterError) {
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
            if (response.status === 200) {
                return JSON.parse(text)
            } else if (response.status === 404) {
                throw new ResourceNotFoundError(
                    ErrorCode.ServerMissingData,
                    `data not found on api server ${text}`,
                    `sendRequest.ApiUtils ${method} ${uri}`,
                    { body },
                    "check the api call parameters. its mostly because some call parameters are wrong",
                    "https://docs.fun.xyz"
                )
            } else if (response.status === 400) {
                throw new InvalidParameterError(
                    ErrorCode.InvalidParameter,
                    `bad request ${text}`,
                    `sendRequest.ApiUtils ${method} ${uri}`,
                    { body },
                    "check the api call parameters. its mostly because some call parameters are wrong",
                    "https://docs.fun.xyz"
                )
            } else if (response.status === 500) {
                throw new InternalFailureError(
                    ErrorCode.ServerFailure,
                    `server failure ${text}`,
                    `sendRequest.ApiUtils ${method} ${uri}`,
                    { body },
                    "retry later. if it still fails, please contact us.",
                    "https://docs.fun.xyz"
                )
            } else if (!response.ok) {
                throw new InternalFailureError(
                    ErrorCode.UnknownServerError,
                    `unknown server failure ${text}`,
                    `sendRequest.ApiUtils ${method} ${uri}`,
                    { body },
                    "retry later. if it still fails, please contact us.",
                    "https://docs.fun.xyz"
                )
            }

            return {}
        }, DEFAULT_RETRY_OPTIONS)
    } catch (err) {
        throw new InternalFailureError(
            ErrorCode.ServerConnectionError,
            `Cannot connect to Fun API Service ${err}`,
            `sendRequest.ApiUtils ${method} ${uri}`,
            { body },
            "retry later. if it still fails, please contact us.",
            "https://docs.fun.xyz"
        )
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
