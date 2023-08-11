import { Address, pad } from "viem"
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
import { commitTransactionParams } from "./Twitter"
import {
    AddOwnerParams,
    AddUserToGroupParams,
    ApproveParams,
    CommitParams,
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
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getAuthIdFromAddr, isAddress } from "../utils"

export abstract class FirstClassActions {
    abstract createOperation(auth: Auth, userId: string, transactionParams: TransactionParams, txOptions: EnvOption): Promise<Operation>

    abstract getAddress(options: EnvOption): Promise<Address>

    async commit(
        auth: Auth,
        userId: string,
        params: CommitParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const transactionParams = await commitTransactionParams(params)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async swap(
        auth: Auth,
        userId: string,
        params: SwapParam,
        txOption: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const oneInchSupported = [1, 56, 31337, 36864]
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
            transactionParams = erc721TransferTransactionParams(params)
        } else if (isERC20TransferParams(params)) {
            transactionParams = erc20TransferTransactionParams(params)
        } else if (isNativeTransferParams(params)) {
            transactionParams = ethTransferTransactionParams(params)
        } else {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Params were missing or incorrect",
                "wallet.transfer",
                { params },
                "Provide correct transfer params.",
                "https://docs.fun.xyz"
            )
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
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Params were missing or incorrect",
                "wallet.tokenApprove",
                { params },
                "Provide correct token approve params.",
                "https://docs.fun.xyz"
            )
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
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Params were missing or incorrect",
                "wallet.unstake",
                { params },
                "Provide correct unstake params.",
                "https://docs.fun.xyz"
            )
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
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
        params: AddOwnerParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (isAddress(params.ownerId)) {
            const authId = await getAuthIdFromAddr(params.ownerId as Address)
            await addUserToWallet(authId, params.chainId.toString(), await this.getAddress(txOptions), [pad(params.ownerId, { size: 32 })])
        }

        const txParams = await addOwnerTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async removeOwner(
        auth: Auth,
        userId: string,
        params: RemoveOwnerParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (isAddress(params.ownerId)) {
            const authId = await getAuthIdFromAddr(params.ownerId as Address)
            await removeUserWalletIdentity(
                authId,
                params.chainId.toString(),
                await this.getAddress(txOptions),
                pad(params.ownerId, { size: 32 })
            )
        }
        const txParams = await removeOwnerTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async createGroup(
        auth: Auth,
        userId: string,
        params: CreateGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const walletAddr = await this.getAddress(txOptions)
        await createGroup(params.groupId, params.chainId.toString(), Number(params.group.threshold), walletAddr, params.group.userIds)
        params.group.userIds.forEach(async (userId) => {
            const authId = await getAuthIdFromAddr(userId as Address)
            await addUserToGroup(authId, params.chainId.toString(), walletAddr, params.groupId)
        })
        const txParams = await createGroupTxParams(params)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async addUserToGroup(
        auth: Auth,
        userId: string,
        params: AddUserToGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        params.userId = pad(params.userId, { size: 32 })
        params.groupId = pad(params.groupId, { size: 32 })
        const groups = await getGroups([params.groupId], params.chainId.toString())
        if (!groups || groups.length === 0) {
            throw new ResourceNotFoundError(
                ErrorCode.GroupNotFound,
                "group is not found",
                "wallet.addUserToGroup",
                { params },
                "Provide correct groupId and chainId.",
                "https://docs.fun.xyz"
            )
        }

        const originalMembers = new Set(groups[0].memberIds)
        const members = new Set(groups[0].memberIds)
        members.add(params.userId)
        if (members.size <= originalMembers.size) {
            throw new InvalidParameterError(
                ErrorCode.UserAlreadyExists,
                "user already exists in group",
                "wallet.addUserToGroup",
                { params, originalMembers, userId: params.userId },
                "Catch this error and swallow it as the user is already added.",
                "https://docs.fun.xyz"
            )
        }

        const authId = await getAuthIdFromAddr(params.userId as Address)
        await addUserToGroup(authId, params.chainId.toString(), await this.getAddress(txOptions), params.groupId)

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
        params: RemoveUserFromGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        params.userId = pad(params.userId, { size: 32 })
        params.groupId = pad(params.groupId, { size: 32 })
        const groups = await getGroups([params.groupId], params.chainId.toString())
        if (!groups || groups.length === 0) {
            throw new ResourceNotFoundError(
                ErrorCode.GroupNotFound,
                "group is not found",
                "wallet.removeUserFromGroup",
                { params },
                "Provide correct groupId and chainId.",
                "https://docs.fun.xyz"
            )
        }

        const originalMembers = new Set(groups[0].memberIds)
        const members = new Set(groups[0].memberIds)
        members.delete(params.userId)
        if (members.size >= originalMembers.size) {
            throw new ResourceNotFoundError(
                ErrorCode.UserNotFound,
                "user does not exist in group",
                "wallet.removeUserFromGroup",
                { params, originalMembers, userId: params.userId },
                "Catch this error and swallow it as the user does not exist in the group.",
                "https://docs.fun.xyz"
            )
        }

        const authId = await getAuthIdFromAddr(params.userId as Address)
        await removeUserFromGroup(authId, params.chainId.toString(), await this.getAddress(txOptions), params.groupId)

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
        params.groupId = pad(params.groupId, { size: 32 })
        const groups = await getGroups([params.groupId], params.chainId.toString())
        if (!groups || groups.length === 0) {
            throw new ResourceNotFoundError(
                ErrorCode.GroupNotFound,
                "group is not found",
                "wallet.updateThresholdOfGroup",
                { params },
                "Provide correct groupId and chainId.",
                "https://docs.fun.xyz"
            )
        }

        if (!Number.isInteger(params.threshold) || params.threshold < 1 || params.threshold > groups[0].memberIds.length) {
            throw new InvalidParameterError(
                ErrorCode.InvalidThreshold,
                "threshold can not be 0 or bigger than number of members in the group",
                "wallet.updateThresholdOfGroup",
                { params, memberIds: groups[0].memberIds },
                "Provide proper threshold number.",
                "https://docs.fun.xyz"
            )
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
        params.groupId = pad(params.groupId, { size: 32 })
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
