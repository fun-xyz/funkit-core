import { Address, Hex, isAddress, pad } from "viem"
import { createSessionKeyCalldata } from "./AccessControl"
import { finishUnstakeCalldata, isFinishUnstakeParams, isRequestUnstakeParams, requestUnstakeCalldata, stakeCalldata } from "./Stake"
import { OneInchCalldata, uniswapV2SwapCalldata, uniswapV3SwapCalldata } from "./Swap"
import {
    erc20ApproveCalldata,
    erc20TransferCalldata,
    erc721ApproveCalldata,
    erc721TransferCalldata,
    ethTransferCalldata,
    isERC20ApproveParams,
    isERC20TransferParams,
    isERC721ApproveParams,
    isERC721TransferParams,
    isNativeTransferParams
} from "./Token"
import {
    AddOwnerParams,
    AddUserToGroupParams,
    ApproveParams,
    CreateGroupParams,
    FinishUnstakeParams,
    OneInchSwapParams,
    RemoveGroupParams,
    RemoveOwnerParams,
    RemoveUserFromGroupParams,
    RequestUnstakeParams,
    SessionKeyParams,
    StakeParams,
    SwapParam,
    TransferParams,
    UniswapParams,
    UpdateGroupParams,
    UpdateThresholdOfGroupParams
} from "./types"
import { addOwnerCalldata, createGroupCalldata, removeGroupCalldata, removeOwnerCalldata, updateGroupCalldata } from "./User"
import { createGroup, deleteGroup, getGroups, updateGroupThreshold } from "../apis/GroupApis"
import { addUserToGroup, addUserToWallet, removeUserFromGroup, removeUserWalletIdentity } from "../apis/UserApis"
import { Auth } from "../auth"
import { TransactionParams, WALLET_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { Operation } from "../data"
import { Helper, InvalidParameterError, MissingParameterError } from "../errors"
import { getAuthIdFromAddr } from "../utils"

export abstract class FirstClassActions {
    abstract createOperation(auth: Auth, userId: string, callData: Hex, txOptions: EnvOption): Promise<Operation>

    abstract getAddress(options: EnvOption): Promise<Address>

    async swap(
        auth: Auth,
        userId: string,
        params: SwapParam,
        txOption: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
        const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
        let callData
        if (oneInchSupported.includes(params.chainId)) {
            callData = await OneInchCalldata(params as OneInchSwapParams)
        } else if (uniswapV3Supported.includes(params.chainId)) {
            callData = await uniswapV3SwapCalldata(params as UniswapParams)
        } else {
            callData = await uniswapV2SwapCalldata(params as UniswapParams)
        }
        return await this.createOperation(auth, userId, callData, txOption)
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData
        if (isERC721TransferParams(params)) {
            callData = await erc721TransferCalldata(params)
        } else if (isERC20TransferParams(params)) {
            callData = await erc20TransferCalldata(params)
        } else if (isNativeTransferParams(params)) {
            callData = await ethTransferCalldata(params)
        } else {
            const currentLocation = "action.transfer"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async tokenApprove(
        auth: Auth,
        userId: string,
        params: ApproveParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData
        if (isERC20ApproveParams(params)) {
            callData = await erc20ApproveCalldata(params)
        } else if (isERC721ApproveParams(params)) {
            callData = await erc721ApproveCalldata(params)
        } else {
            const currentLocation = "action.tokenApprove"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async stake(
        auth: Auth,
        userId: string,
        params: StakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = await stakeCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData
        if (isRequestUnstakeParams(params)) {
            callData = await requestUnstakeCalldata(params as RequestUnstakeParams)
        } else if (isFinishUnstakeParams(params)) {
            callData = await finishUnstakeCalldata(params as FinishUnstakeParams)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async execRawTx(
        auth: Auth,
        userId: string,
        params: TransactionParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, params.value, params.data])
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async createSessionKey(
        auth: Auth,
        userId: string,
        params: SessionKeyParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = await createSessionKeyCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async addOwner(
        auth: Auth,
        userId: string,
        walletAddr: Address,
        params: AddOwnerParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (isAddress(params.ownerId)) {
            const authId = await getAuthIdFromAddr(params.ownerId as Address, params.chainId.toString())
            await addUserToWallet(authId, params.chainId.toString(), walletAddr, [pad(params.ownerId, { size: 32 })])
        }

        const callData = await addOwnerCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async removeOwner(
        auth: Auth,
        userId: string,
        walletAddr: Address,
        params: RemoveOwnerParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (isAddress(params.ownerId)) {
            const authId = await getAuthIdFromAddr(params.ownerId as Address, params.chainId.toString())
            await removeUserWalletIdentity(authId, params.chainId.toString(), walletAddr, pad(params.ownerId, { size: 32 }))
        }
        const callData = await removeOwnerCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async createGroup(
        auth: Auth,
        userId: string,
        walletAddr: Address,
        params: CreateGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        await createGroup(params.groupId, params.chainId.toString(), Number(params.group.threshold), walletAddr, params.group.userIds)
        params.group.userIds.forEach(async (userId) => {
            const authId = await getAuthIdFromAddr(userId as Address, params.chainId.toString())
            await addUserToGroup(authId, params.chainId.toString(), walletAddr, params.groupId)
        })
        const callData = await createGroupCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async addUserToGroup(
        auth: Auth,
        userId: string,
        walletAddr: Address,
        params: AddUserToGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const groups = await getGroups([params.groupId], params.chainId.toString())
        if (!groups || groups.length === 0) {
            const helper = new Helper("Group does not exist", params.groupId, "Bad Request.")
            throw new InvalidParameterError("action.addUserToGroup", "groupId", helper, false)
        }

        let members = new Set(groups[0].memberIds)
        members = members.add(params.userId)
        if (members.size <= groups[0].memberIds.length) {
            const helper = new Helper("User already exists in group", params.userId, "Bad Request.")
            throw new InvalidParameterError("action.addUserToGroup", "userId", helper, false)
        }

        const authId = await getAuthIdFromAddr(params.userId as Address, params.chainId.toString())
        await addUserToGroup(authId, params.chainId.toString(), walletAddr, params.groupId)

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: Array.from(members),
                threshold: groups[0].threshold
            },
            chainId: params.chainId
        }

        const callData = await updateGroupCalldata(updateGroupParams)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async removeUserFromGroup(
        auth: Auth,
        userId: string,
        walletAddr: Address,
        params: RemoveUserFromGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const groups = await getGroups([params.groupId], params.chainId.toString())
        if (!groups || groups.length === 0) {
            const helper = new Helper("Group does not exist", params.groupId, "Bad Request.")
            throw new InvalidParameterError("action.removeUserFromGroup", "groupId", helper, false)
        }

        const members = new Set(groups[0].memberIds)
        members.delete(params.userId)
        if (members.size >= groups[0].memberIds.length) {
            const helper = new Helper("User does not exist in group", params.userId, "Bad Request.")
            throw new InvalidParameterError("action.removeUserFromGroup", "userId", helper, false)
        }

        const authId = await getAuthIdFromAddr(params.userId as Address, params.chainId.toString())
        await removeUserFromGroup(authId, params.chainId.toString(), walletAddr, params.groupId)

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: Array.from(members),
                threshold: groups[0].threshold
            },
            chainId: params.chainId
        }
        const callData = await updateGroupCalldata(updateGroupParams)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async updateThresholdOfGroup(
        auth: Auth,
        userId: string,
        params: UpdateThresholdOfGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const groups = await getGroups([params.groupId], params.chainId.toString())
        if (!groups || groups.length === 0) {
            const helper = new Helper("Group does not exist", params.groupId, "Bad Request.")
            throw new InvalidParameterError("action.updateThresholdOfGroup", "groupId", helper, false)
        }

        if (params.threshold < 1 || params.threshold > groups[0].memberIds.length) {
            const helper = new Helper(
                "Threshold can not be 0 or bigger than number of members in the group",
                params.threshold,
                "Bad Request."
            )
            throw new InvalidParameterError("action.updateThresholdOfGroup", "threshold", helper, false)
        }

        await updateGroupThreshold(params.groupId, params.chainId.toString(), Number(params.threshold))

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: groups[0].memberIds,
                threshold: params.threshold
            },
            chainId: params.chainId
        }
        const callData = await updateGroupCalldata(updateGroupParams)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async removeGroup(
        auth: Auth,
        userId: string,
        params: RemoveGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        await deleteGroup(params.groupId, params.chainId.toString())
        const callData = await removeGroupCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }
}
