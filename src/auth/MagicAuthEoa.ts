import { Address, Hex, pad, toBytes } from "viem"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput } from "./types"
import { WalletSignature, encodeWalletSignature } from "../data"

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

    override async getEstimateGasSignature(): Promise<Hex> {
        await this.init()
        const walletSignature: WalletSignature = {
            userId: await this.getAddress(),
            signature: pad("0x", { size: 65 })
        }
        return encodeWalletSignature(walletSignature)
    }

    override async signHash(hash: Hex): Promise<Hex> {
        await this.init()
        let signature
        if (this.signer?.type === "local") {
            signature = await this.signer.signMessage({ message: { raw: toBytes(hash) } })
        } else if (this.client && this.account) {
            signature = await this.client.signMessage({ account: this.account, message: hash })
        } else {
            throw new Error("No signer or client")
        }
        const walletSignature: WalletSignature = {
            userId: await this.getAddress(),
            signature: signature
        }
        return encodeWalletSignature(walletSignature)
    }
}
