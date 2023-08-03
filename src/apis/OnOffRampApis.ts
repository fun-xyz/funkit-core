import { API_URL } from "../common/constants"
import { ErrorCode, InternalFailureError } from "../errors"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOnRampUrl(walletAddr: string): Promise<string> {
    const url: string = (await sendGetRequest(API_URL, `on-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        throw new InternalFailureError(
            ErrorCode.UnknownServerError,
            "No onramp url found.",
            "FunWallet.onRamp",
            { walletAddr },
            "This is an internal error, please contact support.",
            "https://docs.fun.xyz"
        )
    }
    return url
}

export async function getOffRampUrl(walletAddr: string): Promise<string> {
    const url: string = (await sendGetRequest(API_URL, `off-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        throw new InternalFailureError(
            ErrorCode.UnknownServerError,
            "No offramp url found.",
            "FunWallet.offRamp",
            { walletAddr },
            "This is an internal error, please contact support.",
            "https://docs.fun.xyz"
        )
    }
    return url
}
