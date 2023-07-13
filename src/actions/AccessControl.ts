import { Address, Hex, getAbiItem, getAddress, getFunctionSelector } from "viem"
import { SessionKeyParams } from "./types"
import { HashZero } from "../common"
import { Token } from "../data/Token"
import { formatAbiItem } from "../utils/ViemUtils"

export const createSessionKeyCallData = async (params: SessionKeyParams) => {
    const selectors: Hex[] = []
    params.actionWhitelist.forEach((actionWhitelistItem) => {
        selectors.push(...actionWhitelistItem.functionWhitelist.map((functionName) => getSelector(actionWhitelistItem.abi, functionName)))
    })
    const targets = params.targetWhitelist.map((target) => getAddress(target))
    let recipients: Address[] = []
    let tokens: Address[] = []
    const feeRecipientAndTokenMerkleRootHash = HashZero
    if (params.feeRecipientWhitelist && params.feeTokenWhitelist) {
        recipients = params.feeRecipientWhitelist.map((recipient) => getAddress(recipient))
        tokens = await Promise.all(params.feeTokenWhitelist.map((token) => Token.getAddress(token)))
        // const feeRecipientAndTokenMerkleTree = new
    }
    {
        targets
        feeRecipientAndTokenMerkleRootHash
        recipients
        tokens
    }
}

export const getSelector = (abi: any, functionName: string) => {
    const abiItem = getAbiItem({ abi, name: functionName })
    const definition = formatAbiItem(abiItem)
    return getFunctionSelector(definition)
}
