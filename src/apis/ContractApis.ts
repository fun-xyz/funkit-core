import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getContractAbi(contractName: string, apiKey: string, mode = "abi"): Promise<any> {
    const { name, abi, addresses } = await sendGetRequest(API_URL, `contract/${contractName}?mode=${mode}`, apiKey)
    return { name, abi, addresses }
}
