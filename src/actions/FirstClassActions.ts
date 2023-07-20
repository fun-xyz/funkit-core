import { Address, isAddress, pad } from "viem"
import { addOwnerTxParams, createSessionKeyTransactionParams, removeOwnerTxParams } from "./AccessControl"
import { createExecuteBatchTxParams } from "./BatchActions"
import { createGroupTxParams, removeGroupTxParams, updateGroupTxParams } from "./Group"
import {
    finishUnstakeTransactionParams,
    isFinishUnstakeParams,
    isRequestUnstakeParams,
    requestUnstakeTransactionParams,
    stakeTransactionParams
} from "./Stake"
import { OneInchTransactionParams, uniswapV2SwapTransactionParams, uniswapV3SwapTransactionParams } from "./Swap"
import {
    erc20ApproveTransactionParams,
    erc20TransferTransactionParams,
    erc721ApproveTransactionParams,
    erc721TransferTransactionParams,
    ethTransferTransactionParams,
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
import { createGroup, deleteGroup, getGroups, updateGroup } from "../apis/GroupApis"
import { addUserToGroup, addUserToWallet, removeUserFromGroup, removeUserWalletIdentity } from "../apis/UserApis"
import { Auth } from "../auth"
import { TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Operation } from "../data"
import { Helper, InvalidParameterError, MissingParameterError } from "../errors"
import { getAuthIdFromAddr } from "../utils"

export abstract class FirstClassActions {
    abstract createOperation(auth: Auth, userId: string, transactionParams: TransactionParams, txOptions: EnvOption): Promise<Operation>

    abstract getAddress(options: EnvOption): Promise<Address>

    async swap(
        auth: Auth,
        userId: string,
        params: SwapParam,
        txOption: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
        const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
        let transactionParams: TransactionParams
        if (oneInchSupported.includes(params.chainId)) {
            transactionParams = await OneInchTransactionParams(params as OneInchSwapParams)
        } else if (uniswapV3Supported.includes(params.chainId)) {
            transactionParams = await uniswapV3SwapTransactionParams(params as UniswapParams)
        } else {
            transactionParams = await uniswapV2SwapTransactionParams(params as UniswapParams)
        }
        return await this.createOperation(auth, userId, transactionParams, txOption)
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams: TransactionParams
        if (isERC721TransferParams(params)) {
            transactionParams = await erc721TransferTransactionParams(params)
        } else if (isERC20TransferParams(params)) {
            transactionParams = await erc20TransferTransactionParams(params)
        } else if (isNativeTransferParams(params)) {
            transactionParams = await ethTransferTransactionParams(params)
        } else {
            const currentLocation = "action.transfer"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async tokenApprove(
        auth: Auth,
        userId: string,
        params: ApproveParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams
        if (isERC20ApproveParams(params)) {
            transactionParams = await erc20ApproveTransactionParams(params)
        } else if (isERC721ApproveParams(params)) {
            transactionParams = await erc721ApproveTransactionParams(params)
        } else {
            const currentLocation = "action.tokenApprove"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async stake(
        auth: Auth,
        userId: string,
        params: StakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const transactionParams = await stakeTransactionParams(params)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams: TransactionParams
        if (isRequestUnstakeParams(params)) {
            transactionParams = await requestUnstakeTransactionParams(params as RequestUnstakeParams)
        } else if (isFinishUnstakeParams(params)) {
            transactionParams = await finishUnstakeTransactionParams(params as FinishUnstakeParams)
        } else {
            const currentLocation = "action.unstake"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async execRawTx(
        auth: Auth,
        userId: string,
        params: TransactionParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        return await this.createOperation(auth, userId, params, txOptions)
    }

    async createSessionKey(
        auth: Auth,
        userId: string,
        params: SessionKeyParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const transactionParams = await createSessionKeyTransactionParams(params)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
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

        const txParams = await addOwnerTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
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
        const txParams = await removeOwnerTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
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
        const txParams = await createGroupTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
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

        const txParams = await updateGroupTxParams(updateGroupParams)
        return await this.createOperation(auth, userId, txParams, txOptions)
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
        const txParams = await updateGroupTxParams(updateGroupParams)
        return await this.createOperation(auth, userId, txParams, txOptions)
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

        await updateGroup(params.groupId, params.chainId.toString(), { threshold: Number(params.threshold) })

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: groups[0].memberIds,
                threshold: params.threshold
            },
            chainId: params.chainId
        }
        const txParams = await updateGroupTxParams(updateGroupParams)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async removeGroup(
        auth: Auth,
        userId: string,
        params: RemoveGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        await deleteGroup(params.groupId, params.chainId.toString())
        const txParams = await removeGroupTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async createBatchOperation(
        auth: Auth,
        userId: string,
        params: TransactionParams[],
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const walletAddress = await this.getAddress(txOptions)
        const txParams = createExecuteBatchTxParams(params, walletAddress)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }
}
