import { retry } from "@lifeomic/attempt"
import fetch from "node-fetch"
import { API_URL } from "../common/constants"
import {
    AccessDeniedError,
    ErrorCode,
    InternalFailureError,
    InvalidParameterError,
    ResourceNotFoundError,
    ThrottlingError,
    UserOpFailureError
} from "../errors"
import { stringify } from "./index"

const errorHandler = (err: any, context: any) => {
    if (err instanceof ResourceNotFoundError || err instanceof InvalidParameterError || err instanceof UserOpFailureError) {
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

        headers["api-key-id"] = "dgbhwr0xqb"
        return retry(async function () {
            const response = await fetch(uri, {
                method,
                headers,
                redirect: "follow",
                body: method !== "GET" ? stringify(body) : undefined
            })
            const json = await response.json()
            if (response.ok) {
                return json
            } else if (response.status === 400) {
                throw new InvalidParameterError(
                    ErrorCode.InvalidParameter,
                    `bad request ${JSON.stringify(json)}`,

                    { body },
                    "check the api call parameters. its mostly because some call parameters are wrong",
                    "https://docs.fun.xyz"
                )
            } else if (response.status === 403) {
                throw new AccessDeniedError(
                    ErrorCode.Unauthorized,
                    "Invalid API key or insufficient access.",
                    { apiKey },
                    "Check your api key at https://app.fun.xyz and check with fun team if you believe something is off",
                    "https://docs.fun.xyz"
                )
            } else if (response.status === 404) {
                throw new ResourceNotFoundError(
                    ErrorCode.ServerMissingData,
                    JSON.stringify(json),
                    { body },
                    "check the api call parameters. its mostly because some call parameters are wrong",
                    "https://docs.fun.xyz"
                )
            } else if (response.status === 429) {
                throw new ThrottlingError(
                    ErrorCode.RequestLimitExceeded,
                    `too many requests ${JSON.stringify(json)}`,

                    { body },
                    "you are making too many requests. please slow down. Reach out to fun team if you need more quota",
                    "https://docs.fun.xyz"
                )
            } else if (response.status === 500) {
                if (json.errorCode === ErrorCode.UserOpFailureError) {
                    throw new UserOpFailureError(
                        ErrorCode.UserOpFailureError,
                        JSON.stringify(json),
                        { body },
                        "fix user op failure. Most of the time this is due to invalid parameters",
                        "https://docs.fun.xyz"
                    )
                } else {
                    throw new InternalFailureError(
                        ErrorCode.ServerFailure,
                        `server failure ${JSON.stringify(json)}`,
                        { body },
                        "retry later. if it still fails, please contact us.",
                        "https://docs.fun.xyz"
                    )
                }
            } else if (response.status === 504) {
                throw new InternalFailureError(
                    ErrorCode.ServerTimeout,
                    `server timeout failure ${JSON.stringify(json)}`,
                    { body },
                    "retry later. if it still fails, please contact us.",
                    "https://docs.fun.xyz"
                )
            } else if (!response.ok) {
                throw new InternalFailureError(
                    ErrorCode.UnknownServerError,
                    `unknown server failure ${JSON.stringify(json)}`,
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

            { body },
            "retry later. if it still fails, please contact us.",
            "https://docs.fun.xyz"
        )
    }
}

export async function sendGetRequest(
    uri: string = API_URL,
    endpoint: string,
    apiKey: string = (globalThis as any).globalEnvOption?.apiKey
): Promise<any> {
    return await sendRequest(`${uri}/${endpoint}`, "GET", apiKey)
}

export async function sendPostRequest(
    uri: string = API_URL,
    endpoint: string,
    body: object,
    apiKey: string = (globalThis as any).globalEnvOption?.apiKey
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
