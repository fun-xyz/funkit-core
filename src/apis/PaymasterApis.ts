import { DASHBOARD_API_URL } from "../common/constants"
import { PaymasterType } from "../sponsors/types"
import { sendPostRequest } from "../utils/ApiUtils"
export interface PaymasterTransaction {
    action: string
    amount: number
    from: string
    to: string
    token: string
    txid?: string
}

export async function addTransaction(
    chainId: string,
    timestamp: number,
    txid,
    transaction: PaymasterTransaction,
    paymasterType: PaymasterType,
    sponsorAddress: string
): Promise<any> {
    try {
        return await sendPostRequest(DASHBOARD_API_URL, "paymasters/add-transaction", {
            chain: chainId,
            sponsorAddress,
            type: paymasterType,
            timestamp,
            transaction,
            txid
        })
    } catch (e) {
        /* empty */
    }
}
