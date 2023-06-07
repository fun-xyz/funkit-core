// import { API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/ApiUtils"

const API_URL = "http://127.0.0.1:3003"

export interface PaymasterTransaction {
    action: string
    amount: number
    from: string
    timestamp: number
    to: string
    token: string
    txid?: string
}

export async function updatePaymasterMode(chainId: string, updateObj: any, paymasterType: string, sponsorAddress: string): Promise<any> {
    return await sendPostRequest(API_URL, "paymasters/update-paymaster", {
        chain: chainId,
        sponsorAddress,
        type: paymasterType,
        updateObj
    })
}

export async function removeFromList(
    chainId: string,
    address: string[],
    listType: string,
    paymasterType: string,
    sponsorAddress: string
): Promise<any> {
    return await sendPostRequest(API_URL, "paymasters/remove-from-list", {
        chain: chainId,
        sponsorAddress,
        type: paymasterType,
        listType,
        updateAddrs: address
    })
}

export async function addToList(
    chainId: string,
    address: string[],
    listType: string,
    paymasterType: string,
    sponsorAddress: string
): Promise<any> {
    return await sendPostRequest(API_URL, "paymasters/add-to-list", {
        chain: chainId,
        sponsorAddress,
        type: paymasterType,
        listType,
        updateAddrs: address
    })
}

export async function addTransaction(
    chainId: string,
    transaction: PaymasterTransaction,
    paymasterType: string,
    sponsorAddress: string
): Promise<any> {
    return await sendPostRequest(API_URL, "paymasters/add-transaction", {
        chain: chainId,
        sponsorAddress,
        type: paymasterType,
        transaction
    })
}

export async function addPaymasterToken(chainId: string, tokenAddress: string): Promise<any> {
    return await sendPostRequest(API_URL, "paymasters/add-supported-token", {
        chain: chainId,
        tokenAddress
    })
}

export async function batchOperation(
    chainId: string,
    addresses: string[],
    modes: boolean[],
    list: string,
    paymasterType: string,
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
