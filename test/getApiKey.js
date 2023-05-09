const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager")
const { retry, DEFAULT_RETRY_OPTIONS } = require('../utils/network')

const SECRET_NAME = "FunApiServer/ApiGateway"
const REGION = "us-west-2"
const VERSION_STAGE = "AWSCURRENT"

async function getApiKey() {
    // const client = new SecretsManagerClient({
    //     region: REGION
    // })

    // let response

    // try {
    //     response = await retry(() => client.send(
    //         new GetSecretValueCommand({
    //             SecretId: SECRET_NAME,
    //             VersionStage: VERSION_STAGE
    //         })
    //     ), DEFAULT_RETRY_OPTIONS)
    // } catch (error) {
    //     // For a list of exceptions thrown, see
    //     // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    //     throw error
    // }

    // const secret = JSON.parse(response.SecretString)
    // const apiKey = secret.apigw
    apiKey = "dzRNnQ3C567eKkTMnbB3R1JgNnEYcxNO7Fc4EhqE"
    return apiKey
}

module.exports = { getApiKey }