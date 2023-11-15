import { Address, pad } from "viem"
import { addOwnerTxParams, createSessionKeyTransactionParams, removeOwnerTxParams } from "./AccessControl"
import { createExecuteBatchTxParams } from "./BatchActions"
import { bridgeTransactionParams } from "./Bridge"
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
import { isERC20ApproveParams, isERC721ApproveParams, isERC721TransferParams, isTokenTransferParams } from "./Token"
import { TokenAction } from "./TokenAction"
import {
    AddOwnerParams,
    AddUserToGroupParams,
    ApproveParams,
    BridgeParams,
    CreateGroupParams,
    FinishUnstakeParams,
    LimitOrderParam,
    RemoveGroupParams,
    RemoveOwnerParams,
    RemoveUserFromGroupParams,
    RequestUnstakeParams,
    SessionKeyParams,
    StakeParams,
    SwapParams,
    TransferParams,
    UpdateGroupParams,
    UpdateThresholdOfGroupParams
} from "./types"
import { Auth } from "../auth"
import { TransactionParams } from "../common"
import { GlobalEnvOption } from "../config"
import { Chain, Operation, Token } from "../data"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getOnChainGroupData } from "../utils/GroupUtils"

export abstract class FirstClassActions {
    protected chain: Chain
    protected options: GlobalEnvOption

    constructor(chain: Chain, options: GlobalEnvOption) {
        this.chain = chain
        this.options = options
    }

    /**
     * Creates a new operation to be associated with the wallet and prepares it for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the operation.
     * @param {TransactionParams} transactionParams - The parameters for the transaction.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The created and prepared operation.
     */
    abstract createOperation(
        auth: Auth,
        userId: string,
        transactionParams: TransactionParams,
        txOptions: GlobalEnvOption
    ): Promise<Operation>

    /**
     * Retrieves the wallet address associated with this FunWallet. The address should be the same for all EVM chains so no input is needed
     * If the address is not already cached, it fetches it using the wallet's unique ID and chain information.
     * @returns {Promise<Address>} The wallet address.
     */
    abstract getAddress(): Promise<Address>

    abstract getToken(tokenId: string): Token

    async bridge(auth: Auth, userId: string, params: BridgeParams, txOptions: GlobalEnvOption = this.options): Promise<Operation> {
        const paramsCopy = JSON.parse(JSON.stringify(params))
        paramsCopy.recipient ??= await this.getAddress()
        const transactionParams = await bridgeTransactionParams(paramsCopy, await this.getAddress(), txOptions)
        return this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates a swap operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the swap.
     * @param {SwapParams} params - The parameters for the swap operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared swap operation.
     */
    async swap(auth: Auth, userId: string, params: SwapParams, txOptions: GlobalEnvOption = this.options): Promise<Operation> {
        if (!params.tokenIn) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Missing tokenIn parameter in the swap params object.",
                { params },
                "",
                "https://docs.fun.xyz"
            )
        }
        if (!params.tokenOut) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Missing tokenOut parameter in the swap params object.",
                { params },
                "",
                "https://docs.fun.xyz"
            )
        }
        if (!params.inAmount) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Missing inAmount parameter in the swap params object.",
                { params },
                "",
                "https://docs.fun.xyz"
            )
        }

        if (!(params.tokenIn instanceof Token)) {
            params.tokenIn = this.getToken(params.tokenIn)
        }
        if (!(params.tokenOut instanceof Token)) {
            params.tokenOut = this.getToken(params.tokenOut)
        }

        let transactionParams: TransactionParams
        const chainId = Number(this.chain.getChainId())
        params.recipient ??= await this.getAddress()
        if (oneInchSupported.includes(chainId)) {
            transactionParams = await oneInchTransactionParams(params, await this.getAddress(), this.chain)
        } else if (uniswapV3Supported.includes(chainId)) {
            transactionParams = await uniswapV3SwapTransactionParams(params, this.chain)
        } else if (chainId === 8453) {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Swap is not supported on Base",
                { params },
                "Use a different chain or a different first class method",
                "https://docs.fun.xyz"
            )
        } else {
            transactionParams = await uniswapV2SwapTransactionParams(params, this.chain, txOptions.apiKey)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates a limit swap order operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the limit swap order.
     * @param {LimitOrderParam} params - The parameters for the limit swap order.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared limit swap order operation.
     */
    async limitSwapOrder(
        auth: Auth,
        userId: string,
        params: LimitOrderParam,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        const transactionParams: TransactionParams = await limitSwapOrderTransactionParams(params, this.chain, txOptions.apiKey)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates a transfer operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the transfer.
     * @param {TransferParams} params - The parameters for the transfer.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared transfer operation.
     * @throws {InvalidParameterError} When provided parameters are missing or incorrect.
     */
    async transfer(auth: Auth, userId: string, params: TransferParams, txOptions: GlobalEnvOption = this.options): Promise<Operation> {
        let transactionParams: TransactionParams
        if (isERC721TransferParams(params)) {
            params.from = params.from ? params.from : await this.getAddress()
            transactionParams = await new TokenAction(txOptions).erc721TransferTransactionParams(params)
        } else if (isTokenTransferParams(params)) {
            if (!(params.token instanceof Token)) {
                params.token = this.getToken(params.token)
            }
            if (params.from) {
                transactionParams = await new TokenAction(txOptions).tokenTransferFromTransactionParams(params)
            } else {
                transactionParams = await new TokenAction(txOptions).tokenTransferTransactionParams(params)
            }
        } else {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Params were missing or incorrect",
                { params },
                "Provide correct transfer params.",
                "https://docs.fun.xyz"
            )
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates a erc20/erc721 token approval operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the token approval.
     * @param {ApproveParams} params - The parameters for the token approval.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared token approval operation.
     * @throws {InvalidParameterError} When provided parameters are missing or incorrect.
     */
    async tokenApprove(auth: Auth, userId: string, params: ApproveParams, txOptions: GlobalEnvOption = this.options): Promise<Operation> {
        let transactionParams
        if (isERC20ApproveParams(params)) {
            if (!(params.token instanceof Token)) {
                params.token = this.getToken(params.token)
            }
            transactionParams = await new TokenAction(txOptions).erc20ApproveTransactionParams(params)
        } else if (isERC721ApproveParams(params)) {
            transactionParams = await new TokenAction(txOptions).erc721ApproveTransactionParams(params)
        } else {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Params were missing or incorrect",
                { params },
                "Provide correct token approve params.",
                "https://docs.fun.xyz"
            )
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates a stake operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the stake operation.
     * @param {StakeParams} params - The parameters for the stake operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared stake operation.
     */
    async stake(auth: Auth, userId: string, params: StakeParams, txOptions: GlobalEnvOption = this.options): Promise<Operation> {
        const transactionParams = await stakeTransactionParams(params, txOptions)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates an unstake operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the unstake operation.
     * @param {RequestUnstakeParams | FinishUnstakeParams} params - The parameters for the unstake operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared unstake operation.
     * @throws {InvalidParameterError} When provided parameters are missing or incorrect.
     */
    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        params.recipient ??= await this.getAddress()
        let transactionParams: TransactionParams
        if (isRequestUnstakeParams(params)) {
            transactionParams = await requestUnstakeTransactionParams(params as RequestUnstakeParams, txOptions)
        } else if (isFinishUnstakeParams(params)) {
            transactionParams = await finishUnstakeTransactionParams(params as FinishUnstakeParams, txOptions)
        } else {
            throw new InvalidParameterError(
                ErrorCode.InvalidParameter,
                "Params were missing or incorrect",
                { params },
                "Provide correct unstake params.",
                "https://docs.fun.xyz"
            )
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates a session key creation operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the session key creation.
     * @param {SessionKeyParams} params - The parameters for the session key creation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared session key creation operation.
     */
    async createSessionKey(
        auth: Auth,
        userId: string,
        params: SessionKeyParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        const transactionParams = await createSessionKeyTransactionParams(params, this.chain, txOptions.apiKey)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Initiates an add owner operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the add owner operation.
     * @param {AddOwnerParams} params - The parameters for the add owner operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared add owner operation.
     */
    async addOwner(auth: Auth, userId: string, params: AddOwnerParams, txOptions: GlobalEnvOption = this.options): Promise<Operation> {
        const txParams = await addOwnerTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates a remove owner operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the remove owner operation.
     * @param {RemoveOwnerParams} params - The parameters for the remove owner operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared remove owner operation.
     */
    async removeOwner(
        auth: Auth,
        userId: string,
        params: RemoveOwnerParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        const txParams = await removeOwnerTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates a create group operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the create group operation.
     * @param {CreateGroupParams} params - The parameters for the create group operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared create group operation.
     */
    async createGroup(
        auth: Auth,
        userId: string,
        params: CreateGroupParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        const txParams = await createGroupTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates an add user to group operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the add user to group operation.
     * @param {AddUserToGroupParams} params - The parameters for the add user to group operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared add user to group operation.
     */
    async addUserToGroup(
        auth: Auth,
        userId: string,
        params: AddUserToGroupParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        params.userId = pad(params.userId, { size: 32 })
        params.groupId = pad(params.groupId, { size: 32 })
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
        const onChainGroupData = await getOnChainGroupData(params.groupId, chain, await this.getAddress())
        if (!onChainGroupData || onChainGroupData.memberIds.length === 0) {
            throw new ResourceNotFoundError(
                ErrorCode.GroupNotFound,
                "group is not found",
                { params },
                "Provide correct groupId and chainId.",
                "https://docs.fun.xyz"
            )
        }

        const originalMembers = new Set(onChainGroupData.memberIds)
        const members = new Set(onChainGroupData.memberIds)
        members.add(params.userId)
        if (members.size <= originalMembers.size) {
            throw new InvalidParameterError(
                ErrorCode.UserAlreadyExists,
                "user already exists in group",
                { params, originalMembers, userId: params.userId },
                "Catch this error and swallow it as the user is already added.",
                "https://docs.fun.xyz"
            )
        }

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: Array.from(members),
                threshold: onChainGroupData.threshold
            }
        }

        const txParams = await updateGroupTxParams(
            updateGroupParams,
            await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
        )
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates a remove user from group operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the remove user from group operation.
     * @param {RemoveUserFromGroupParams} params - The parameters for the remove user from group operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared remove user from group operation.
     */
    async removeUserFromGroup(
        auth: Auth,
        userId: string,
        params: RemoveUserFromGroupParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        params.userId = pad(params.userId, { size: 32 })
        params.groupId = pad(params.groupId, { size: 32 })
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
        const onChainGroupData = await getOnChainGroupData(params.groupId, chain, await this.getAddress())
        if (!onChainGroupData || onChainGroupData.memberIds.length === 0) {
            throw new ResourceNotFoundError(
                ErrorCode.GroupNotFound,
                "group is not found",
                { params },
                "Provide correct groupId and chainId.",
                "https://docs.fun.xyz"
            )
        }

        const originalMembers = new Set(onChainGroupData.memberIds)
        const members = new Set(onChainGroupData.memberIds)
        members.delete(params.userId)
        if (members.size >= originalMembers.size) {
            throw new ResourceNotFoundError(
                ErrorCode.UserNotFound,
                "user does not exist in group",
                { params, originalMembers, userId: params.userId },
                "Catch this error and swallow it as the user does not exist in the group.",
                "https://docs.fun.xyz"
            )
        }

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: Array.from(members),
                threshold: onChainGroupData.threshold
            }
        }
        const txParams = await updateGroupTxParams(
            updateGroupParams,
            await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
        )
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates an update threshold of group operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the update threshold of group operation.
     * @param {UpdateThresholdOfGroupParams} params - The parameters for the update threshold of group operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared update threshold of group operation.
     */
    async updateThresholdOfGroup(
        auth: Auth,
        userId: string,
        params: UpdateThresholdOfGroupParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        params.groupId = pad(params.groupId, { size: 32 })
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
        const onChainGroupData = await getOnChainGroupData(params.groupId, chain, await this.getAddress())
        if (!onChainGroupData || onChainGroupData.memberIds.length === 0) {
            throw new ResourceNotFoundError(
                ErrorCode.GroupNotFound,
                "group is not found",
                { params },
                "Provide correct groupId and chainId.",
                "https://docs.fun.xyz"
            )
        }

        if (!Number.isInteger(params.threshold) || params.threshold < 1 || params.threshold > onChainGroupData.memberIds.length) {
            throw new InvalidParameterError(
                ErrorCode.InvalidThreshold,
                "threshold can not be 0 or bigger than number of members in the group",
                { params, memberIds: onChainGroupData.memberIds },
                "Provide proper threshold number.",
                "https://docs.fun.xyz"
            )
        }

        const updateGroupParams: UpdateGroupParams = {
            groupId: params.groupId,
            group: {
                userIds: onChainGroupData.memberIds,
                threshold: params.threshold
            }
        }
        const txParams = await updateGroupTxParams(
            updateGroupParams,
            await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
        )
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates a remove group operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the remove group operation.
     * @param {RemoveGroupParams} params - The parameters for the remove group operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared remove group operation.
     */
    async removeGroup(
        auth: Auth,
        userId: string,
        params: RemoveGroupParams,
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        params.groupId = pad(params.groupId, { size: 32 })
        const txParams = await removeGroupTxParams(params, txOptions)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }

    /**
     * Initiates a batch operation and returns the prepared operation for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the batch operation.
     * @param {TransactionParams[]} params - An array of transaction parameters for the batch operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared batch operation.
     */
    async createBatchOperation(
        auth: Auth,
        userId: string,
        params: TransactionParams[],
        txOptions: GlobalEnvOption = this.options
    ): Promise<Operation> {
        const walletAddress = await this.getAddress()
        const txParams = createExecuteBatchTxParams(params, walletAddress)
        return await this.createOperation(auth, userId, txParams, txOptions)
    }
}
