import { Hex, keccak256, stringToBytes } from "viem"

export class WalletIdentifier {
    uniqueId: string
    index: number
    identifier?: string

    constructor(uniqueId: string, index = 0) {
        this.uniqueId = uniqueId
        this.index = index
    }

    async getIdentifier(forced = false): Promise<Hex> {
        return this.getIdentifierFromuniqueId(forced)
    }

    getIdentifierFromuniqueId(forced = false): Hex {
        if (!this.identifier || forced) {
            this.identifier = keccak256(stringToBytes(`${this.uniqueId}-${this.index}`))
        }
        return this.identifier! as Hex
    }
}
