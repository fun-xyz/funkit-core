import { EnvOption } from "../config"
import { GASLESS_SPONSOR_TYPE, TOKEN_SPONSOR_TYPE } from "../sponsors"

export const getPaymasterType = (txOptions: EnvOption) => {
    if (txOptions.gasSponsor?.sponsorAddress && txOptions.gasSponsor?.token) {
        return TOKEN_SPONSOR_TYPE
    } else if (txOptions.gasSponsor?.sponsorAddress) {
        return GASLESS_SPONSOR_TYPE
    } else {
        throw Error("Invalid paymaster type")
    }
}
