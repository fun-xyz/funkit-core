export enum PaymasterType {
    BaseSponsor = "BaseSponsor",
    GaslessSponsor = "GaslessSponsor",
    TokenSponsor = "TokenSponsor"
}

export interface AllTokenData {
    unlockBlock: bigint
    tokenAmount: bigint
}
