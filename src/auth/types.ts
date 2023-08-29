import { Address, Hex } from "viem"

export type WalletCallData = {
    target: Address
    value: bigint
    calldata: Hex
    feeInfo?: {
        token: Address
        recipient: Address
        amount: bigint
    }
}
