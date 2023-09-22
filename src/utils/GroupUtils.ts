import { Address, Hex, concat, decodeAbiParameters, keccak256 } from "viem"
import { WALLET_CONTRACT_INTERFACE } from "../common"
import { Chain } from "../data"
import { GroupInfo } from "../wallet"

export async function getOnChainGroupData(groupId: Hex, chain: Chain, walletAddr: Address): Promise<GroupInfo> {
    const userAuthContractAddr = await chain.getAddress("userAuthAddress")
    const groupKey = keccak256(concat([groupId, userAuthContractAddr]))
    const storedGroupData: Hex = await WALLET_CONTRACT_INTERFACE.readFromChain(walletAddr, "getState", [groupKey], chain)
    if (storedGroupData === "0x") {
        return {
            memberIds: [],
            threshold: 0
        }
    } else {
        const decodedData = decodeAbiParameters(
            [
                {
                    type: "tuple",
                    components: [{ type: "bytes32[]" }, { type: "uint256" }]
                }
            ],
            storedGroupData
        )

        const storedGroup = decodedData as unknown as [Hex[], number]

        return {
            memberIds: storedGroup[0] as Hex[],
            threshold: Number(storedGroup[1])
        }
    }
}
