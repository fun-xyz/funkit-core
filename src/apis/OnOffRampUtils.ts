import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOnRampUrl(walletAddr: string): Promise<void> {
    return (await sendGetRequest(API_URL, `on-ramp/${walletAddr}?provider=moonpay`))?.url
}

export async function getOffRampUrl(walletAddr: string): Promise<void> {
    return (await sendGetRequest(API_URL, `off-ramp/${walletAddr}?provider=moonpay`))?.url
}
