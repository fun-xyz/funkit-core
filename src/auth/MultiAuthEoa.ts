import { Web3Provider } from "@ethersproject/providers"
import { Signer } from "ethers"
import { hexZeroPad, toUtf8Bytes } from "ethers/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { Eoa, EoaAuthInput } from "./EoaAuth"
import { WalletSignature, encodeWalletSignature } from "../data"
import { Helper, ParameterFormatError } from "../errors"
import { getStoredUniqueId, setStoredUniqueId } from "../utils/AuthUtils"

export interface MultiAuthEoaInput extends EoaAuthInput {
    authIds: []
}

export class MultiAuthEoa extends Eoa {
    authIds = []
    uniqueId = ""

    constructor(authInput: MultiAuthEoaInput) {
        super(authInput)
        this.authIds = authInput.authIds //[["twitter###Chazzz", "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"], ["google###chaz@fun.xyz", "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"], ["0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4", "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"]]
    }

    override async getUniqueId(): Promise<string> {
        const uniqueIds = new Set<string>()
        for (const authId of this.authIds) {
            const storedUniqueId = await getStoredUniqueId(authId[0])
            if (storedUniqueId) {
                uniqueIds.add(storedUniqueId)
            }
        }

        if (uniqueIds.size > 1) {
            const helper = new Helper("Invalid parameters", this.authIds, "authIds already link to multiple fun wallets")
            throw new ParameterFormatError("MultiAuthEoa.getUniqueId", helper)
        }

        if (uniqueIds.size === 1) {
            ;[this.uniqueId] = uniqueIds
        } else {
            this.uniqueId = uuidv4()
        }

        for (const authId of this.authIds) {
            await setStoredUniqueId(authId[0], this.uniqueId, authId[1])
        }

        return this.uniqueId
    }

    override async getOwnerAddr(): Promise<string[]> {
        return this.authIds.map((authId) => {
            return authId[1]
        })
    }

    override async getEstimateGasSignature(): Promise<string> {
        const walletSignature: WalletSignature = {
            userId: await this.getOwnerAddr()[0],
            signature: hexZeroPad(toUtf8Bytes(""), 65)
        }
        return encodeWalletSignature(walletSignature)
    }

    override async getSignerFromProvider(provider: Web3Provider): Promise<Signer> {
        return await provider.getSigner()
    }
}
