import { Address, Hex } from "viem"
import { Auth } from "./Auth"
import { AuthInput } from "./types"
import { Operation } from "../data"

export class SessionKeyAuth extends Auth {
    constructor(authInput: AuthInput, rpId: string) {
        super(authInput)
        // Create this.client and set it to the viem client
    }

    override async signHash(hash: Hex, isGroupOp = false): Promise<Hex> {}

    override async signOp(operation: Operation, chain: Chain): Promise<Hex> {}

    override async getAddress(): Promise<Address> {}
}
