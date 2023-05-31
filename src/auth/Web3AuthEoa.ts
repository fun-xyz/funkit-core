import { Web3Provider } from "@ethersproject/providers"
import { BytesLike, Signer } from "ethers"
import { Eoa, EoaAuthInput } from "./EoaAuth"

export class Web3AuthEoa extends Eoa {
    constructor(eoaAuthInput: EoaAuthInput) {
        super(eoaAuthInput)
    }

    override async signHash(hash: BytesLike): Promise<string> {
        const address = await this.getUniqueId()
        return await this.provider!.send("personal_sign", [hash, address])
    }

    override async getSignerFromProvider(provider: Web3Provider): Promise<Signer> {
        return await provider.getSigner()
    }
}
