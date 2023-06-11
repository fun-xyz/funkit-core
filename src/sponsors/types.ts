export enum PaymasterType {
    BaseSponsor = "BaseSponsor",
    GaslessSponsor = "gasless",
    TokenSponsor = "token"
}

export interface AllTokenData {
    unlockBlock: bigint
    tokenAmount: bigint
}
