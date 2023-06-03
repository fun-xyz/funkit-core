import { BigNumber, BytesLike } from "ethers"
import { Chain } from "../../data"

export interface TransactionData {
    to: string
    value: BigNumber | 0
    data: BytesLike
    chain: Chain
}
