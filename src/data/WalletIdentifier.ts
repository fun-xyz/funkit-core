import { keccak256, toUtf8Bytes } from "ethers/lib/utils"

export class WalletIdentifier {
    uniqueId: string
    index: number
    identifier?: string

    constructor(uniqueId: string, index = 0) {
        this.uniqueId = uniqueId
        this.index = index
    }

    async getIdentifier(forced = false): Promise<string> {
        return this.getIdentifierFromuniqueId(forced)
    }

    getIdentifierFromuniqueId(forced = false): string {
        if (!this.identifier || forced) {
            this.identifier = keccak256(toUtf8Bytes(`${this.uniqueId}-${this.index}`))
        }
        return this.identifier!
    }
}
