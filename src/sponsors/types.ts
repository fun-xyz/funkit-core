import { BigNumber } from "ethers"

export enum PaymasterType {
    BaseSponsor = "BaseSponsor",
    GaslessSponsor = "gasless",
    TokenSponsor = "token"
}

export interface AllTokenData {
    unlockBlock: BigNumber
    tokenAmount: BigNumber
}
