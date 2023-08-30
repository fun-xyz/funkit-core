import { FUN_FAUCET_URL } from "../common"
import { sendGetRequest } from "../utils"

export const sendAsset = async function (token: string, chain: string, walletAddress: string) {
    return await sendGetRequest(FUN_FAUCET_URL, `get-faucet?token=${token}&testnet=${chain}&addr=${walletAddress}`)
}
