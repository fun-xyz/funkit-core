import { EnvOption } from "../config"
import { PaymasterType } from "../sponsors/types"

export const getPaymasterType = (txOptions: EnvOption) => {
    if (txOptions.gasSponsor?.sponsorAddress && txOptions.gasSponsor?.token) {
        return PaymasterType.TokenSponsor
    } else if (txOptions.gasSponsor?.sponsorAddress) {
        return PaymasterType.GaslessSponsor
    } else {
        throw Error("Invalid paymaster type")
    }
}
