import { isHex } from "viem"

export const isBytes32 = (input: string): boolean => {
    if (!isHex(input)) {
        return false
    }
    return input.length === 66
}
