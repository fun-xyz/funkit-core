export type ErrorData = {
    location: string
    error?: {
        txDetails?: ErrorTransactionDetails
        reasonData?: {
            title: string
            reasons: string[]
        }
    }
}

export type ErrorTransactionDetails = {
    method: string
    params: any[]
    contractAddress?: string
    chainId?: number | string
}
