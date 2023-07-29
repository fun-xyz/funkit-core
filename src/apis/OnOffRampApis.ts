import { API_URL } from "../common/constants"
import { Helper, InternalFailureError } from "../errors"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOnRampUrl(walletAddr: string): Promise<void> {
    const url = (await sendGetRequest(API_URL, `on-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        const helper = new Helper("Calling onramp", "GET", "Empty data returned")
        throw new InternalFailureError("FunWallet.onRamp", "No onramp url found.", helper, true)
    }
    return url
}

export async function getOffRampUrl(walletAddr: string): Promise<void> {
    const url = (await sendGetRequest(API_URL, `off-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        const helper = new Helper("Calling offramp", "GET", "Empty data returned")
        throw new InternalFailureError("FunWallet.offRamp", "No offramp url found.", helper, true)
    }
    return url
}
