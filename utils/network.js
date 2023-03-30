const fetch = require("node-fetch")
const retryLib = require('@lifeomic/attempt').retry;

const retry = async (func, options) => {
    return await retryLib(func, options);
}

const sendRequest = async (uri, method, apiKey, body) => {
    try {
        return retry(async function () {
            return await fetch(uri, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': apiKey
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify(body)
            }).then(r => r.json())
        }, DEFAULT_RETRY_OPTIONS)
    } catch (e) {
        console.log(e)
    }
}

// Constants

const DEFAULT_RETRY_OPTIONS = {
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

module.exports = { sendRequest, DEFAULT_RETRY_OPTIONS };
