import { API_URL } from "../common/constants"
import { ErrorCode, InternalFailureError } from "../errors"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOnRampUrl(walletAddr: string): Promise<void> {
    const url = (await sendGetRequest(API_URL, `on-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        throw new InternalFailureError(
            ErrorCode.ServerFailure,
            `fail to get on ramp url for ${walletAddr}`,
            "FunWallet.onRamp",
            { walletAddr },
            "retry later. if it still fails, please contact us.",
            "https://docs.fun.xyz"
        )
    }
    return url
}

export async function getOffRampUrl(walletAddr: string): Promise<void> {
    const url = (await sendGetRequest(API_URL, `off-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        throw new InternalFailureError(
            ErrorCode.ServerFailure,
            `fail to get off ramp url for ${walletAddr}`,
            "FunWallet.offRamp",
            { walletAddr },
            "retry later. if it still fails, please contact us.",
            "https://docs.fun.xyz"
        )
    }
    return url
}
