import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOnRampUrl(walletAddr: string): Promise<void> {
    return (await sendGetRequest(API_URL, `assets/moonpay/buyUrl/${walletAddr}`))?.url
}

export async function getOffRampUrl(walletAddr: string): Promise<void> {
    return (await sendGetRequest(API_URL, `assets/moonpay/sellUrl/${walletAddr}`))?.url
}
