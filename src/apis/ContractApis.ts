import { sendGetRequest } from "../utils/ApiUtils"

export async function getContractAbi(contractName: string, mode = "abi"): Promise<any> {
    return await sendGetRequest("API_URL", `contract/${contractName}?mode=${mode}`)
}
