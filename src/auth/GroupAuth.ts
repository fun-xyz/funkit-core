import { setGroupById, getGroupById } from "../apis"
import { Helper, ParameterFormatError } from "../errors"
import { v4 as uuidv4 } from "uuid"
import { keccak256, toUtf8Bytes } from "ethers/lib/utils"
import { Eoa, EoaAuthInput } from "./EoaAuth"

type GroupAuthInput = {
    uniqueId?: string
    userIds?: string[]
    requiredSignatures?: number
}

class GroupAuth extends Eoa {
    uniqueId?: string
    userIds?: string[]
    requiredSignatures?: number

    constructor(authData: EoaAuthInput, groupData: GroupAuthInput) {
        super(authData)
        let { uniqueId, userIds, requiredSignatures } = groupData
        if (!(uniqueId || userIds)) {
            const helper = new Helper("Invalid parameters", { uniqueId, userIds }, "Either uniqueId or userIds must be provided")
            helper.pushMessage("Either uniqueId or userIds must be provided")
            throw new ParameterFormatError("GroupAuth.constructor", helper)
        }
        requiredSignatures = requiredSignatures ? requiredSignatures : 1
        Object.assign(this, { uniqueId, userIds, requiredSignatures })
    }

    async _init() {
        if (this.userIds) {
            this.uniqueId = keccak256(toUtf8Bytes(uuidv4()))
            await setGroupById(this.uniqueId!, this.userIds, this.requiredSignatures!)
        } else {
            this.userIds = await getGroupById(this.uniqueId!)
            this
        }
    }

    async getMembers(): Promise<string[]> {
        await this._init()
        return this.userIds!
    }

    override async getUniqueId(): Promise<string> {
        await this._init()
        return this.uniqueId!
    }

    override async getEstimateGasSignature(): Promise<string> {
        return await this.getUniqueId()
    }

    override async getOwnerAddr(): Promise<string[]> {
        return await this.getMembers()
    }
}

export { GroupAuth }
