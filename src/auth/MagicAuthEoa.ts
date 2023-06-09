import { Address, Hex } from "viem"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput } from "./types"

export interface MagicAuthEoaInput extends EoaAuthInput {
    uniqueId: Hex
}

export class MagicAuthEoa extends Eoa {
    uniqueId: Hex

    constructor(authInput: MagicAuthEoaInput) {
        super(authInput)
        this.uniqueId = authInput.uniqueId
    }

    override async getUniqueId(): Promise<Hex> {
        return this.uniqueId
    }

    override async getOwnerAddr(): Promise<Hex[]> {
        if (this.signer?.address === undefined) throw new Error("No signer")
        return [this.signer.address]
    }

    override async getAddress(): Promise<Address> {
        return await this.getOwnerAddr()[0]
    }
}
