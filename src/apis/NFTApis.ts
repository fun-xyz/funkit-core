import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

/**
 * Get the name of an NFT collection
 * @param {string} chainId https://chainlist.org/
 * @param {string} nftAddress Address of NFT
 * @returns JSON
 * {
 *    "success": true,
 *    "name": "Anatomy Science Ape Club"
 * }
 */
export async function getNftName(chainId: string, nftAddress: string): Promise<any> {
    return await sendGetRequest(API_URL, `asset/nft/${chainId}/${nftAddress}`)
}

/**
 * Get the address and chainId of an NFT collection
 * @param {string} name Name of NFT
 * @returns JSON
 * {
 *    "success": true,
 *    "address": "0x96fc56721d2b79485692350014875b3b67cb00eb",
 *    "chain": "1"
 * }
 */
export async function getNftAddress(name: string): Promise<any> {
    return await sendGetRequest(API_URL, `asset/nft?name=${name}`)
}
