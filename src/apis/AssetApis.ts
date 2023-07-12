import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

/**
 * Get all tokens for a specific chain
 * @param {string} chainId https://chainlist.org/
 * @param {string} holderAddr
 * @param {string} onlyVerifiedTokens If true, only return alchemy tokens that are verified(filters spam)
 * @returns JSON
 * {
 *    "0xTokenAddress": {
 *        "tokenBalance": "0x00001",
 *        "symbol": "USDC",
 *        "decimals": 6,
 *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
 *        "price": 1.0001,
 *     }
 * }
 */
export async function getTokens(chainId: string, holderAddr: string, onlyVerifiedTokens: boolean): Promise<any> {
    // return await sendPostRequest(API_URL, "getAssets/get-tokens", {
    //     chain: chainId,
    //     address: holderAddr,
    //     onlyVerifiedTokens: onlyVerifiedTokens
    // })
    const res = await sendGetRequest(API_URL, `erc20s/${holderAddr}/${chainId}?onlyVerifiedTokens=${onlyVerifiedTokens}`)
    return res
}

/**
 * Calls the fun api server to get all the NFTs owned by the holder
 * @param {string} chainId From https://chainlist.org/
 * @param {string} holderAddr Address of holder
 * @returns array
 *  [
 *     {
 *       "address": "string",
 *       "token_id": "string",
 *       "floor_price": "string",
 *     }
 *  ]
 */
export async function getNFTs(chainId: string, holderAddr: string): Promise<any> {
    // return await sendPostRequest(API_URL, "getAssets/get-nfts", {
    //     chain: chainId,
    //     address: holderAddr
    // })
    const res = await sendGetRequest(API_URL, `nfts/${holderAddr}/${chainId}`)
    return res
}

/**
 * Calls the fun api server to get all the NFTs owned by the holder
 * @param {string} holderAddr Address of holder
 * @returns array
 *  {
 *     "1" : [{
 *       "address": "string",
 *       "token_id": "string",
 *       "floor_price": "string",
 *     }],
 *  }
 */
export async function getAllNFTs(holderAddr: string): Promise<any> {
    // return await sendPostRequest(API_URL, "getAssets/get-all-nfts", {
    //     address: holderAddr
    // })
    const res = await sendGetRequest(API_URL, `nfts/${holderAddr}`)
    return res
}

/**
 * Get all tokens for a specific chain
 * @param {string} holderAddr
 * @param {string} onlyVerifiedTokens If true, only return alchemy tokens that are verified(filters spam)
 * @returns JSON
 * {
 *    1: {
 *      "0xTokenAddress": {
 *        "tokenBalance": "0x00001",
 *        "symbol": "USDC",
 *        "decimals": 6,
 *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
 *        "price": 1.0001,
 *     }
 *   }
 * }
 */
export async function getAllTokens(holderAddr: string, onlyVerifiedTokens: boolean): Promise<any> {
    // return await sendPostRequest(API_URL, "getAssets/get-all-tokens", {
    //     address: holderAddr,
    //     onlyVerifiedTokens: onlyVerifiedTokens
    // })
    const res = await sendGetRequest(API_URL, `nfts/${holderAddr}?onlyVerifiedTokens=${onlyVerifiedTokens}`)
    return res
}

/**
 * Get all lido withdrawal request ids for all chains
 * @param {string} chainId https://chainlist.org/ ie "1" for ethereum
 * @param {string} holderAddr Address of holder
 * @returns [readyToWithdrawRequestIds, notReadyToWithdrawRequestIds]
 * [
 *   [
 *     123,
 *     124,
 *   ],
 *   [
 *     412
 *     413
 *   ]
 * ]
 */
export async function getLidoWithdrawals(chainId: string, holderAddr: string): Promise<any> {
    // return await sendPostRequest(API_URL, "getAssets/get-lido-withdrawals", {
    //     chain: chainId,
    //     address: holderAddr
    // })
    const res = await sendGetRequest(API_URL, `assets/lido-withdrawals/${holderAddr}/${chainId}`)
    return res
}
