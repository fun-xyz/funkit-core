const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

async function getApiKey() {
    const secret_name = "FunApiServer/ApiGateway";
    
    const client = new SecretsManagerClient({
        region: "us-west-2",
    });
    
    let response;
    
    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
            })
        );
    } catch (error) {
        // For a list of exceptions thrown, see
        // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        throw error;
    }
    
    const secret = JSON.parse(response.SecretString);
    const apiKey = secret.apigw;
    console.log("API Key: ", apiKey);
    return apiKey;
}

getApiKey().catch((error) => {
    console.error("Error retrieving API key:", error);
});

module.exports = getApiKey;
