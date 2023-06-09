import { BigNumber } from "ethers"

export enum PaymasterType {
    BaseSponsor = "BaseSponsor",
    GaslessSponsor = "GaslessSponsor",
    TokenSponsor = "TokenSponsor"
}

export interface AllTokenData {
    unlockBlock: BigNumber
    tokenAmount: BigNumber
}
