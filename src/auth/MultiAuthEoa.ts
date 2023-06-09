import { v4 as uuidv4 } from "uuid"
import { Address, Hex } from "viem"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput } from "./types"
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

    override async getUniqueId(): Promise<Hex> {
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

        return this.uniqueId as Hex
    }

    override async getOwnerAddr(): Promise<Hex[]> {
        return this.authIds.map((authId) => {
            return authId[1]
        })
    }

    override async getEstimateGasSignature(): Promise<Hex> {
        const ownerAddr = await this.getOwnerAddr()
        return ownerAddr[0]
    }

    override async getAddress(): Promise<Address> {
        return await this.getOwnerAddr()[0]
    }
}
