import { BigNumber } from "ethers"
import { keccak256, toUtf8Bytes } from "ethers/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput, GroupAuthInput } from "./types"
import { getGroupById, setGroupById } from "../apis"
import { Helper, ParameterFormatError } from "../errors"

export class GroupAuth extends Eoa {
    uniqueId?: string
    userIds?: string[]
    requiredSignatures?: number

    constructor(authData: EoaAuthInput, groupData: GroupAuthInput) {
        super(authData)
        const { uniqueId, userIds } = groupData
        let { requiredSignatures } = groupData
        if (!(uniqueId || userIds)) {
            const helper = new Helper("Invalid parameters", { uniqueId, userIds }, "Either uniqueId or userIds must be provided")
            helper.pushMessage("Either uniqueId or userIds must be provided")
            throw new ParameterFormatError("GroupAuth.constructor", helper)
        }
        requiredSignatures = requiredSignatures ? requiredSignatures : 1
        Object.assign(this, { uniqueId, userIds, requiredSignatures })
    }

    async _init() {
        if (this.userIds && !this.uniqueId) {
            const authId = await super.getUniqueId()!
            if (!this.userIds.includes(authId)) {
                this.userIds.push(authId)
                this.userIds = this.userIds.sort((a: string, b: string) => {
                    return BigNumber.from(a).gt(BigNumber.from(b)) ? -1 : 1
                })
            }
            this.uniqueId = keccak256(toUtf8Bytes(uuidv4()))
            await setGroupById(this.uniqueId!, this.userIds, this.requiredSignatures!)
        } else if (!this.userIds) {
            this.userIds = await getGroupById(this.uniqueId!)
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