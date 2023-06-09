import { Web3Provider } from "@ethersproject/providers"
import { Signer } from "ethers"
import { BytesLike, arrayify, hexZeroPad, toUtf8Bytes } from "ethers/lib/utils"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput } from "./types"
import { WalletSignature, encodeWalletSignature } from "../data"

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

    override async getAddress(): Promise<string> {
        return await this.getOwnerAddr()[0]
    }
    override async getEstimateGasSignature(): Promise<string> {
        const signer = await this.getSigner()
        const walletSignature: WalletSignature = {
            userId: await signer.getAddress(),
            signature: hexZeroPad(toUtf8Bytes(""), 65)
        }
        return encodeWalletSignature(walletSignature)
    }

    override async signHash(hash: BytesLike): Promise<string> {
        await this.init()
        const signer = await this.getSigner()
        const walletSignature: WalletSignature = {
            signature: await this.signer!.signMessage(arrayify(hash)),
            userId: await signer.getAddress()
        }
        return encodeWalletSignature(walletSignature)
    }
}
