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

export async function updatePaymasterMode(
    chainId: string,
    updateObj: any,
    paymasterType: PaymasterType,
    sponsorAddress: string
): Promise<any> {
    try {
        return await sendPostRequest(DASHBOARD_API_URL, "paymasters/update", {
            chain: chainId,
            sponsorAddress,
            type: paymasterType,
            updateObj
        })
    } catch (e) {
        /* empty */
    }
}

export async function removeFromList(
    chainId: string,
    address: string[],
    listType: string,
    paymasterType: PaymasterType,
    sponsorAddress: string
): Promise<any> {
    try {
        return await sendPostRequest(DASHBOARD_API_URL, "paymasters/remove-from-list", {
            chain: chainId,
            sponsorAddress,
            type: paymasterType,
            listType,
            updateAddrs: address
        })
    } catch (e) {
        /* empty */
    }
}

export async function addToList(
    chainId: string,
    address: string[],
    listType: string,
    paymasterType: PaymasterType,
    sponsorAddress: string
): Promise<any> {
    try {
        return await sendPostRequest(DASHBOARD_API_URL, "paymasters/add-to-list", {
            chain: chainId,
            sponsorAddress,
            type: paymasterType,
            listType,
            updateAddrs: address
        })
    } catch (e) {
        /* empty */
    }
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

export async function addPaymasterToken(chainId: string, tokenAddress: string): Promise<any> {
    try {
        return await sendPostRequest(DASHBOARD_API_URL, "paymasters/supported-tokens/add", {
            chain: chainId,
            tokenAddress
        })
    } catch (e) {
        /* empty */
    }
}

export async function batchOperation(
    chainId: string,
    addresses: string[],
    modes: boolean[],
    list: string,
    paymasterType: PaymasterType,
    sponsorAddress: string
): Promise<any> {
    const addList = addresses.filter((_, i) => {
        return modes[i]
    })
    const removeList = addresses.filter((_, i) => {
        return !modes[i]
    })

    await addToList(chainId, addList, list, paymasterType, sponsorAddress)
    await removeFromList(chainId, removeList, list, paymasterType, sponsorAddress)
}
