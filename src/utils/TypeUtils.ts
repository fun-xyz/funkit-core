import { isHex } from "viem"
import { BYTES32_LENGTH } from "../common"

export const isBytes32 = (input: string): boolean => {
    if (!isHex(input)) {
        return false
    }
    return input.length === BYTES32_LENGTH
}
