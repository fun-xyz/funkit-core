import { API_URL } from "../common/constants"
import { ErrorCode, InternalFailureError } from "../errors"
import { sendGetRequest } from "../utils/ApiUtils"

export async function getOnRampUrl(walletAddr: string): Promise<string> {
    const url: string = (await sendGetRequest(API_URL, `on-ramp/${walletAddr}?provider=moonpay`))?.url
    if (!url) {
        throw new InternalFailureError(
            ErrorCode.UnknownServerError,
            "No onramp url found.",
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
            { walletAddr },
            "This is an internal error, please contact support.",
            "https://docs.fun.xyz"
        )
    }
    return url
}

export interface Currency {
    id: string
    name: string
    code: string
    createdAt?: string
    updatedAt?: string
    type?: string
    precision?: number
    addressRegex?: string
    testnetAddressRegex?: string
    maxAmount?: number
    maxBuyAmount?: number
    maxSellAmount?: number
    minAmount?: number
    minBuyAmount?: number
    minSellAmount?: number
    supportsAddressTag?: boolean
    addressTagRegex?: string
    supportsTestMode?: boolean
    isSuspended?: boolean
    isSupportedInUS?: boolean
    isSellSupported?: boolean
    notAllowedUSStates?: string[]
}

export async function getOnRampSupportedCurrencies(): Promise<Currency[]> {
    const currencies: Currency[] = await sendGetRequest(API_URL, "on-ramp/currencies")
    if (!currencies || !currencies.length) {
        throw new InternalFailureError(
            ErrorCode.UnknownServerError,
            "No supported currencies found.",
            {},
            "This is an internal error, please contact support.",
            "https://docs.fun.xyz"
        )
    }
    return currencies
}
