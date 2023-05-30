import { Eoa, EoaAuthInput } from "./EoaAuth"
import { Signer } from "ethers"
import { Web3Provider } from "@ethersproject/providers"

export class MagicAuthEoa extends Eoa {
    uniqueId: string

    constructor(eoaAuthInput: EoaAuthInput, uniqueId: string) {
        super(eoaAuthInput)
        this.uniqueId = uniqueId
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
