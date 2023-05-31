import { BigNumber, BytesLike } from "ethers"
import { Chain } from "../../data"

export interface TransactionData {
    to: string
    value: BigNumber | undefined
    data: BytesLike
    chain: Chain
}
