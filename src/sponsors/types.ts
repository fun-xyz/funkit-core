export enum PaymasterType {
    BaseSponsor = "base",
    GaslessSponsor = "gasless",
    TokenSponsor = "token"
}

export interface AllTokenData {
    unlockBlock: bigint
    tokenAmount: bigint
}
