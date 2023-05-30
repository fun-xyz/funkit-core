import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { DEFAULT_RETRY_OPTIONS } from "../src/utils"
import { retry } from "@lifeomic/attempt"

const SECRET_NAME = "FunApiServer/ApiGateway"
const REGION = "us-west-2"
const VERSION_STAGE = "AWSCURRENT"

export async function getTestApiKey(): Promise<string> {
    const client = new SecretsManagerClient({
        region: REGION
    })

    let response

    try {
        response = await retry(
            () =>
                client.send(
                    new GetSecretValueCommand({
                        SecretId: SECRET_NAME,
                        VersionStage: VERSION_STAGE
                    })
                ),
            DEFAULT_RETRY_OPTIONS
        )
    } catch (error) {
        // For a list of exceptions thrown, see
        // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        console.error("Error retrieving API key:", error)
        return ""
    }

    const secret = JSON.parse(response.SecretString)
    const apiKey = secret.apigw
    return apiKey
}
