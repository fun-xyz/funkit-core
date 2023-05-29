import { parseEther } from "ethers/lib/utils"

export const _stake = (input: any) => {
    return async (actionData: any) => {
        const { chain } = actionData
        const lidoAddress = getLidoAddress(chain.id.toString())
        let reasonData = null
        if (!lidoAddress) {
            reasonData = {
                title: "Possible reasons:",
                reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
            }
        }
        const data = { to: lidoAddress, data: "0x", value: parseEther(`${input.amount}`) }
        const errorData = {
            location: "action.stake",
            error: {
                reasonData
            }
        }
        return { data, errorData }
    }
}

export const getLidoAddress = (chainId: string) => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return null
    }
}
