const retry = require('@lifeomic/attempt').retry;

exports.default_retry_options = {
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

exports.retry = async function (func, options) {
    return await retry(func, options);
}
