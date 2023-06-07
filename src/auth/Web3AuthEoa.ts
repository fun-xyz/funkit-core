// import { Hex } from "viem"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput } from "./types"

export class Web3AuthEoa extends Eoa {
    constructor(authInput: EoaAuthInput) {
        super(authInput)
    }

    // override async signHash(hash: Hex): Promise<Hex> {
    //     const address = await this.getUniqueId()
    //     return await this.provider!.send("personal_sign", [hash, address])
    // }
}
