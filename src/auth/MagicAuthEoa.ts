import { Web3Provider } from "@ethersproject/providers"
import { Signer } from "ethers"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput } from "./types"

export interface MagicAuthEoaInput extends EoaAuthInput {
    uniqueId: string
}

export class MagicAuthEoa extends Eoa {
    uniqueId: string

    constructor(authInput: MagicAuthEoaInput) {
        super(authInput)
        this.uniqueId = authInput.uniqueId
    }

    override async getUniqueId(): Promise<string> {
        return this.uniqueId
    }

    override async getOwnerAddr(): Promise<string[]> {
        const signer = await this.getSigner()
        return [await signer.getAddress()]
    }

    override async getSignerFromProvider(provider: Web3Provider): Promise<Signer> {
        return await provider.getSigner()
    }
}
