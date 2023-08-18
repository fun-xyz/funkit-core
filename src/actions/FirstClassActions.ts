import { Address, pad } from "viem"
import { addOwnerTxParams, createSessionKeyTransactionParams, removeOwnerTxParams } from "./AccessControl"
import { createExecuteBatchTxParams } from "./BatchActions"
import { createGroupTxParams, removeGroupTxParams, updateGroupTxParams } from "./Group"
import { limitSwapOrderTransactionParams } from "./LimitOrder"
import {
    finishUnstakeTransactionParams,
    isFinishUnstakeParams,
    isRequestUnstakeParams,
    requestUnstakeTransactionParams,
    stakeTransactionParams
} from "./Stake"
import {
    oneInchSupported,
    oneInchTransactionParams,
    uniswapV2SwapTransactionParams,
    uniswapV3Supported,
    uniswapV3SwapTransactionParams
} from "./Swap"
import {
    erc20ApproveTransactionParams,
    erc721ApproveTransactionParams,
    erc721TransferTransactionParams,
    isERC20ApproveParams,
    isERC721ApproveParams,
    isERC721TransferParams,
    isTokenTransferParams,
    tokenTransferFromTransactionParams,
    tokenTransferTransactionParams
} from "./Token"
import {
    AddOwnerParams,
    AddUserToGroupParams,
    ApproveParams,
    CreateGroupParams,
    FinishUnstakeParams,
    LimitOrderParam,
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
import { Chain, Operation } from "../data"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getAuthIdFromAddr, isAddress } from "../utils"

export abstract class FirstClassActions {
    abstract createOperation(auth: Auth, userId: string, transactionParams: TransactionParams, txOptions: EnvOption): Promise<Operation>

    abstract getAddress(): Promise<Address>

    async swap(
        auth: Auth,
        userId: string,
        params: SwapParam,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams: TransactionParams
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = Number(await chain.getChainId())
        if (oneInchSupported.includes(chainId)) {
            transactionParams = await oneInchTransactionParams(params as OneInchSwapParams, txOptions)
        } else if (uniswapV3Supported.includes(chainId)) {
            transactionParams = await uniswapV3SwapTransactionParams(params as UniswapParams, txOptions)
        } else {
            transactionParams = await uniswapV2SwapTransactionParams(params as UniswapParams, txOptions)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async limitSwapOrder(
        auth: Auth,
        userId: string,
        params: LimitOrderParam,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const transactionParams: TransactionParams = await limitSwapOrderTransactionParams(params, txOptions)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams: TransactionParams
        if (isERC721TransferParams(params)) {
            params.from = params.from ? params.from : await this.getAddress()
            transactionParams = await erc721TransferTransactionParams(params)
        } else if (isTokenTransferParams(params)) {
            if (params.from) {
                transactionParams = await tokenTransferFromTransactionParams(params, txOptions)
            } else {
                transactionParams = await tokenTransferTransactionParams(params, txOptions)
            }
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
            transactionParams = await erc20ApproveTransactionParams(params, txOptions)
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
        const transactionParams = await stakeTransactionParams(params, txOptions)
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
            transactionParams = await requestUnstakeTransactionParams(params as RequestUnstakeParams, txOptions)
        } else if (isFinishUnstakeParams(params)) {
            transactionParams = await finishUnstakeTransactionParams(params as FinishUnstakeParams, txOptions)
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
        const transactionParams = await createSessionKeyTransactionParams(params, txOptions)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async addOwner(
        auth: Auth,
        userId: string,
        params: AddOwnerParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (isAddress(params.ownerId)) {
            const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
            const authId = await getAuthIdFromAddr(params.ownerId as Address)
            await addUserToWallet(authId, await chain.getChainId(), await this.getAddress(), [pad(params.ownerId, { size: 32 })])
        }

        const txParams = await addOwnerTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async removeOwner(
        auth: Auth,
        userId: string,
        params: RemoveOwnerParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (isAddress(params.ownerId)) {
            const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
            const authId = await getAuthIdFromAddr(params.ownerId as Address)
            await removeUserWalletIdentity(authId, await chain.getChainId(), await this.getAddress(), pad(params.ownerId, { size: 32 }))
        }
        const txParams = await removeOwnerTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async createGroup(
        auth: Auth,
        userId: string,
        params: CreateGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const walletAddr = await this.getAddress()
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = await chain.getChainId()
        await createGroup(params.groupId, chainId, Number(params.group.threshold), walletAddr, params.group.userIds)
        params.group.userIds.forEach(async (userId) => {
            const authId = await getAuthIdFromAddr(userId as Address)
            await addUserToGroup(authId, chainId, walletAddr, params.groupId)
        })
        const txParams = await createGroupTxParams(params, txOptions)
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
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = await chain.getChainId()
        const groups = await getGroups([params.groupId], chainId)
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
        await addUserToGroup(authId, chainId, await this.getAddress(), params.groupId)

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: Array.from(members),
                threshold: groups[0].threshold
            }
        }

        const txParams = await updateGroupTxParams(updateGroupParams, txOptions)
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
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = await chain.getChainId()
        const groups = await getGroups([params.groupId], chainId)
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
        await removeUserFromGroup(authId, chainId, await this.getAddress(), params.groupId)

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: Array.from(members),
                threshold: groups[0].threshold
            }
        }
        const txParams = await updateGroupTxParams(updateGroupParams, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async updateThresholdOfGroup(
        auth: Auth,
        userId: string,
        params: UpdateThresholdOfGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        params.groupId = pad(params.groupId, { size: 32 })
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = await chain.getChainId()
        const groups = await getGroups([params.groupId], chainId)
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

        await updateGroup(params.groupId, chainId, { threshold: Number(params.threshold) })

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: groups[0].memberIds,
                threshold: params.threshold
            }
        }
        const txParams = await updateGroupTxParams(updateGroupParams, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async removeGroup(
        auth: Auth,
        userId: string,
        params: RemoveGroupParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        params.groupId = pad(params.groupId, { size: 32 })
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        await deleteGroup(params.groupId, await chain.getChainId())
        const txParams = await removeGroupTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    async createBatchOperation(
        auth: Auth,
        userId: string,
        params: TransactionParams[],
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const walletAddress = await this.getAddress()
        const txParams = createExecuteBatchTxParams(params, walletAddress)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }
}
