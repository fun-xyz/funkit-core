import { DASHBOARD_API_URL, TEST_API_KEY } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOrgInfo(apiKey: string): Promise<any> {
    if (apiKey == TEST_API_KEY) {
        return { id: "test", name: "test" }
    }
    return await sendGetRequest(DASHBOARD_API_URL, "apikey", apiKey).then((r) => {
        return r.data
    })
}
