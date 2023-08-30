import { Address, Hex, concat, createPublicClient, encodeAbiParameters, http, isAddress, keccak256, pad, toBytes } from "viem"
import { FunWalletParams, User } from "./types"
import { FirstClassActions } from "../actions/FirstClassActions"
import { getAllNFTs, getAllTokens, getLidoWithdrawals, getNFTs, getOffRampUrl, getOnRampUrl, getTokens } from "../apis"
import { checkWalletAccessInitialization, initializeWalletAccess } from "../apis/AccessControlApis"
import { createGroup, getGroups } from "../apis/GroupApis"
import { createOp, deleteOp, executeOp, getFullReceipt, getOps, getOpsOfWallet, scheduleOp, signOp } from "../apis/OperationApis"
import { addTransaction } from "../apis/PaymasterApis"
import { GroupMetadata } from "../apis/types"
import { addUserToWallet } from "../apis/UserApis"
import { Auth } from "../auth"
import { ENTRYPOINT_CONTRACT_INTERFACE, ExecutionReceipt, TransactionParams, WALLET_CONTRACT_INTERFACE } from "../common"
import { AddressZero, FACTORY_CONTRACT_INTERFACE } from "../common/constants"
import { EnvOption, parseOptions } from "../config"
import {
    AuthType,
    Chain,
    InitCodeParams,
    LoginData,
    Operation,
    OperationStatus,
    OperationType,
    Token,
    encodeLoginData,
    encodeUserAuthInitData,
    toBytes32Arr
} from "../data"
import { ErrorCode, InternalFailureError, InvalidParameterError } from "../errors"
import { GaslessSponsor, TokenSponsor } from "../sponsors"
import { generateRandomNonceKey, getWalletAddress, isGroupOperation, isSignatureMissing, isWalletInitOp } from "../utils"
import { getPaymasterType } from "../utils/PaymasterUtils"
import { isBytes32 } from "../utils/TypeUtils"

export class FunWallet extends FirstClassActions {
    walletUniqueId?: Hex
    userInfo?: Map<Hex, User>
    address?: Address

    /**
     * Creates FunWallet object
     * @constructor
     * @param {object} params - The parameters for the constructing fun wallet - (users, uniqueId) or walletAddr
     */
    constructor(params: FunWalletParams | string) {
        super()
        if (typeof params === "string") {
            if (isAddress(params as string)) {
                this.address = params as Address
            } else {
                throw new InvalidParameterError(
                    ErrorCode.InvalidParameter,
                    "string input must be an address type",
                    params,
                    "Provide either (uniqueId, users) or walletAddr when constructing a FunWallet",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions/create-funwallet#create-funwallet-manual-funwallet-creation"
                )
            }
        } else {
            const { users, uniqueId } = params as FunWalletParams
            if (!uniqueId || !isBytes32(uniqueId) || !users || users.length <= 0) {
                throw new InvalidParameterError(
                    ErrorCode.InvalidParameter,
                    "uniqueId must be bytes32 and users must be non-empty",
                    params,
                    "The uniqueId field should be a 32 byte Hexstring and the users field should be an array of User objects",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions/create-funwallet#create-funwallet-manual-funwallet-creation"
                )
            }

            this.userInfo = new Map(
                users?.map((user) => {
                    return [pad(user.userId, { size: 32 }), user] as [Hex, User]
                })
            )

            this.walletUniqueId = uniqueId as Hex
        }
    }

    /**
     * Retrieves the wallet address associated with this FunWallet. The address should be the same for all EVM chains so no input is needed
     * If the address is not already cached, it fetches it using the wallet's unique ID and chain information.
     * @returns {Promise<Address>} The wallet address.
     */
    async getAddress(): Promise<Address> {
        if (!this.address) {
            this.address = await getWalletAddress(await Chain.getChain({ chainIdentifier: 137 }), this.walletUniqueId!)
        }
        return this.address!
    }

    /**
     * Retrieves the wallet address associated with the provided unique ID using the given API key.
     * @param {string} uniqueId - The unique ID of the wallet.
     * @param {string} apiKey - The API key to access the required resources.
     * @returns {Promise<Address>} The wallet address.
     */
    static async getAddress(uniqueId: string, apiKey: string): Promise<Address> {
        ;(globalThis as any).globalEnvOption.apiKey = apiKey
        return await getWalletAddress(await Chain.getChain({ chainIdentifier: 137 }), keccak256(toBytes(uniqueId)))
    }

    /**
     * Retrieves the wallet address associated with the provided unique ID in an offline environment.
     * @param {string} uniqueId - The unique ID of the wallet.
     * @param {string} rpcUrl - The URL of the RPC endpoint for offline querying.
     * @param {Address} factoryAddress - The address of the factory contract.
     * @returns {Promise<Address>} The wallet address.
     */
    static async getAddressOffline(uniqueId: string, rpcUrl: string, factoryAddress: Address) {
        const client = await createPublicClient({
            transport: http(rpcUrl)
        })
        return await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "getAddress", [keccak256(toBytes(uniqueId))], client)
    }

    /**
     * Get all tokens for a specific chain
     * @param {string} chainId string version of the chainId or ALL. If empty, then default to the one in globalEnvOption
     * @param {string} onlyVerifiedTokens If true, only return alchemy tokens that are verified(filters spam) - defaults to false
     * @returns JSON
     */
    async getTokens(chainIdInput?: string, onlyVerifiedTokens = false) {
        let chainId
        if (!chainIdInput) {
            const chain = await Chain.getChain({ chainIdentifier: (globalThis as any).globalEnvOption.chain })
            chainId = await chain.getChainId()
        } else {
            chainId = chainIdInput
        }

        if (chainId === "ALL") {
            return await getAllTokens(await this.getAddress(), onlyVerifiedTokens)
        } else {
            return await getTokens(chainId, await this.getAddress(), onlyVerifiedTokens)
        }
    }

    /**
     * Given an address and a chain, returns all NFTs owned by that address
     * @param {string} chainId string version of the chainId or ALL. If empty, then default to the one in globalEnvOption
     * @returns array
     */
    async getNFTs(chainIdInput?: string) {
        let chainId
        if (!chainIdInput) {
            const chain = await Chain.getChain({ chainIdentifier: (globalThis as any).globalEnvOption.chain })
            chainId = await chain.getChainId()
        } else {
            chainId = chainIdInput
        }

        if (chainId === "ALL") {
            return await getAllNFTs(await this.getAddress())
        } else {
            return await getNFTs(chainId, await this.getAddress())
        }
    }

    /**
     * Get all tokens on all supported chains. Merge tokens by symbol
     * @param {string} chainIdInput string version of the chainId or ALL. If empty, then default to the one in globalEnvOption
     * @param {*} onlyVerifiedTokens true if you want to filter out spam tokens(Uses alchemy lists)
     * @param {boolean} checkStatus true if you want to check if the address has any pending lido withdrawals
     * @returns JSON of all tokens owned by address
     */
    async getAssets(chainIdInput?: string, onlyVerifiedTokens = false, checkStatus = false) {
        let chainId
        if (!chainIdInput) {
            const chain = await Chain.getChain({ chainIdentifier: (globalThis as any).globalEnvOption.chain })
            chainId = await chain.getChainId()
        } else {
            chainId = chainIdInput
        }

        let tokens = {},
            nfts = {},
            lidoWithdrawals = {}
        if (chainId === "ALL") {
            tokens = await getAllTokens(await this.getAddress(), onlyVerifiedTokens)
            nfts = await getAllNFTs(await this.getAddress())
            if (checkStatus) {
                const ethMainnetLidoWithdrawals = await getLidoWithdrawals("1", await this.getAddress())
                const goerliLidoWithdrawals = await getLidoWithdrawals("5", await this.getAddress())
                lidoWithdrawals = { ...ethMainnetLidoWithdrawals, ...goerliLidoWithdrawals }
            }
        } else {
            tokens = await getTokens(chainId, await this.getAddress(), onlyVerifiedTokens)
            nfts = await getNFTs(chainId, await this.getAddress())
            if (checkStatus) {
                lidoWithdrawals = await getLidoWithdrawals(chainId, await this.getAddress())
            }
        }
        return { ...lidoWithdrawals, ...tokens, ...nfts }
    }

    /**
     * Retrieves the nonce value for the specified sender address and nonce key.
     * If the nonce is unavailable, a random nonce key is generated and returned as the nonce.
     * @param {string} sender - The sender's address.
     * @param {string} key - The nonce key (default: randomly generated).
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<bigint>} The nonce value.
     */
    async getNonce(
        sender: string,
        key = generateRandomNonceKey(),
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<bigint> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        let nonce = undefined
        let retryCount = 3
        while ((nonce === undefined || nonce === null) && retryCount > 0) {
            nonce = await ENTRYPOINT_CONTRACT_INTERFACE.readFromChain(entryPointAddress, "getNonce", [sender, key], chain)
            retryCount--
        }

        if (nonce !== undefined && nonce !== null) {
            return BigInt(nonce)
        } else {
            return BigInt(key << 64n)
        }
    }

    /**
     * Retrieves a list of operations associated with the wallet.
     * @param {OperationStatus} status - The status of operations to retrieve (default: OperationStatus.ALL).
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation[]>} A list of operations.
     */
    async getOperations(
        status: OperationStatus = OperationStatus.ALL,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation[]> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        return await getOpsOfWallet(await this.getAddress(), await chain.getChainId(), status)
    }

    /**
     * Retrieves a specific operation by its ID.
     * @param {Hex} opId - The ID of the operation to retrieve.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The requested operation.
     */
    async getOperation(opId: Hex, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<Operation> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        return (await getOps([opId], await chain.getChainId()))[0]
    }

    /**
     * Retrieves a list of users associated with the wallet and their potential corresponding group information.
     * @param {Auth} auth - The authentication instance for retrieving user information.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<User[]>} A list of users with their group information.
     */
    async getUsers(auth: Auth, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<User[]> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const storedUserIds = await auth.getUserIds(await this.getAddress(), await chain.getChainId())
        const userIds = new Set([...storedUserIds])
        if (this.userInfo) {
            for (const userId of this.userInfo.keys()) {
                userIds.add(userId)
            }
        }

        const users: User[] = []
        const groupIds: Hex[] = []

        for (const userId of userIds) {
            if (pad(userId, { size: 32 }) === (await auth.getUserId())) {
                users.push({ userId: pad(userId, { size: 32 }) } as User)
            } else {
                groupIds.push(pad(userId, { size: 32 }))
            }
        }

        if (groupIds && groupIds.length > 0) {
            const groups: GroupMetadata[] = await getGroups(groupIds, await chain.getChainId())
            groups.forEach((group) => {
                users.push({
                    userId: group.groupId,
                    groupInfo: {
                        threshold: group.threshold,
                        memberIds: group.memberIds
                    }
                })
            })
        }

        return users
    }

    /**
     * Checks the deployment status of the wallet's address to determine if it's a contract.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<boolean>} `true` if the address is a contract, `false` otherwise.
     */
    async getDeploymentStatus(txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<boolean> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        return await chain.addressIsContract(await this.getAddress())
    }

    /**
     * Creates the wallet.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the operation.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The operation to create the wallet.
     */
    async create(auth: Auth, userId: string, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<Operation> {
        const transactionParams: TransactionParams = { to: await this.getAddress(), data: "0x", value: 0n }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    /**
     * Generates an on-ramp URL for the account address.
     * @param {Address} address - The account address (optional, defaults to the wallet's address).
     * @returns {Promise<string>} The on-ramp URL.
     */
    async onRamp(address?: Address): Promise<string> {
        return await getOnRampUrl(address ? address : await this.getAddress())
    }

    /**
     * Generates an off-ramp URL for the account address.
     * @param {Address} address - The account address (optional, defaults to the wallet's address).
     * @returns {Promise<string>} The off-ramp URL.
     */
    async offRamp(address?: Address): Promise<string> {
        return await getOffRampUrl(address ? address : await this.getAddress())
    }

    /**
     * Creates a new operation to be associated with the wallet and prepares it for execution.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the operation.
     * @param {TransactionParams} transactionParams - The parameters for the transaction.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The created and prepared operation.
     */
    async createOperation(
        auth: Auth,
        userId: string,
        transactionParams: TransactionParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        if (!userId || userId === "") {
            throw new InvalidParameterError(
                ErrorCode.MissingParameter,
                "userId is required",
                { userId: userId },
                "Provide userId when createOperation",
                "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
            )
        }
        userId = pad(userId as Hex, { size: 32 })
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })

        const sender = await this.getAddress()
        const initCode = (await chain.addressIsContract(sender)) ? "0x" : await this.getThisInitCode(chain)
        let paymasterAndData = "0x"

        let maxFeePerGas, maxPriorityFeePerGas
        const chainId = await chain.getChainId()
        const OPStackChains = ["10"]
        if (OPStackChains.includes(chainId)) {
            maxFeePerGas = 10n ** 8n
            maxPriorityFeePerGas = 10n ** 8n
        } else if (chainId === "8453") {
            maxFeePerGas = 10n ** 9n
            maxPriorityFeePerGas = 10n ** 9n
        } else {
            maxFeePerGas = 1n
            maxPriorityFeePerGas = 1n
        }

        const partialOp = {
            callData: await this.buildCalldata(auth, userId, transactionParams, txOptions),
            paymasterAndData,
            sender,
            maxFeePerGas,
            maxPriorityFeePerGas,
            initCode,
            nonce: txOptions.nonce !== null && txOptions.nonce !== undefined ? txOptions.nonce : await this.getNonce(sender),
            preVerificationGas: 100_000n,
            callGasLimit: BigInt(10e6),
            verificationGasLimit: BigInt(10e6)
        }

        const isGroupOp: boolean = (await auth.getUserId()) !== (userId as Hex)

        const operation: Operation = new Operation(partialOp, {
            chainId: await chain.getChainId(),
            opType: isGroupOp ? OperationType.GROUP_OPERATION : OperationType.SINGLE_OPERATION,
            authType: isGroupOp ? AuthType.MULTI_SIG : AuthType.ECDSA,
            walletAddr: await this.getAddress(),
            proposer: await auth.getAddress()
        })

        if (isGroupOp) {
            operation.groupId = pad(userId as Hex, { size: 32 })
        }
        if (txOptions.gasSponsor && Object.keys(txOptions.gasSponsor).length > 0) {
            if (txOptions.gasSponsor.token) {
                const sponsor = new TokenSponsor(txOptions)
                if (txOptions.gasSponsor.usePermit) {
                    paymasterAndData = (
                        await sponsor.getPaymasterAndDataPermit(operation, await this.getAddress(), userId, auth)
                    ).toLowerCase()
                } else {
                    paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
                }
            } else {
                const sponsor = new GaslessSponsor(txOptions)
                paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
            }
        }
        operation.userOp.paymasterAndData = paymasterAndData

        const estimatedOperation = await this.estimateOperation(auth, userId, operation, txOptions)

        // sign the userOp directly here as we do not have the opId yet
        estimatedOperation.userOp.signature = await auth.signOp(estimatedOperation, chain, isGroupOperation(operation))

        if (txOptions.skipDBAction !== true) {
            const opId = await createOp(estimatedOperation)
            estimatedOperation.opId = opId as Hex
            if (!(await checkWalletAccessInitialization(sender))) {
                await initializeWalletAccess(sender, await auth.getAddress())
            }
        }

        return estimatedOperation
    }

    /**
     * Signs an operation using the provided authentication instance and returns the signed operation.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {Operation} operation - The operation to be signed.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The signed operation.
     */
    async signOperation(auth: Auth, operation: Operation, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<Operation> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        operation = Operation.convertTypeToObject(operation)
        operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
        if (isGroupOperation(operation) && txOptions.skipDBAction !== true) {
            await signOp(
                operation.opId!,
                await chain.getChainId(),
                operation.userOp.signature as Hex,
                await auth.getAddress(),
                this.userInfo?.get(operation.groupId!)?.groupInfo?.threshold
            )
        }

        return operation
    }

    /**
     * Executes an operation and returns the execution receipt.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {Operation} operation - The operation to be executed.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<ExecutionReceipt>} The execution receipt of the operation.
     */
    async executeOperation(
        auth: Auth,
        operation: Operation,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<ExecutionReceipt> {
        txOptions = parseOptions(txOptions)
        operation = Operation.convertTypeToObject(operation)
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = await chain.getChainId()

        if (txOptions.skipDBAction !== true) {
            // cache group info
            if (isGroupOperation(operation)) {
                const groups: GroupMetadata[] = await getGroups([operation.groupId!], chainId)
                if (groups && groups.length > 0) {
                    // could be empty as a new wallet wants to create a group
                    this.userInfo?.set(operation.groupId!, {
                        userId: operation.groupId!,
                        groupInfo: {
                            threshold: groups[0].threshold,
                            memberIds: groups[0].memberIds
                        }
                    })
                }
            }
        }

        const threshold: number = this.userInfo?.get(operation.groupId!)?.groupInfo?.threshold ?? 1
        if (threshold <= 1) {
            if (!operation.userOp.signature || operation.userOp.signature === "0x") {
                operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
            }
        } else {
            if (txOptions.skipDBAction !== true) {
                // check remote collected signature
                const storedOps = await getOps([operation.opId!], chainId)

                let collectedSigCount: number
                if (isSignatureMissing(await auth.getUserId(), storedOps[0]?.signatures)) {
                    collectedSigCount = storedOps[0]?.signatures?.length ? storedOps[0]?.signatures?.length + 1 : 1
                    if (collectedSigCount >= threshold) {
                        operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
                    }
                } else {
                    collectedSigCount = storedOps[0]?.signatures?.length ?? 1
                }

                if (collectedSigCount < threshold) {
                    throw new InvalidParameterError(
                        ErrorCode.InsufficientSignatures,
                        "Signatures are not sufficient to execute the operation",
                        { threshold, collectedSigCount, chainId },
                        "Only execute operation with enough signatures",
                        "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                    )
                }
            } else {
                throw new InvalidParameterError(
                    ErrorCode.InsufficientSignatures,
                    "Signatures are not sufficient to execute the operation",
                    { threshold, chainId, skipDBAction: txOptions.skipDBAction },
                    "Only execute operation with enough signatures",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                )
            }
        }

        let receipt: ExecutionReceipt
        if (isGroupOperation(operation)) {
            receipt = await executeOp({
                opId: operation.opId!,
                chainId,
                executedBy: await auth.getAddress(),
                entryPointAddress: await chain.getAddress("entryPointAddress"),
                signature: operation.userOp.signature as Hex,
                groupInfo: this.userInfo?.get(operation.groupId!)?.groupInfo
            })
        } else {
            receipt = await executeOp({
                opId: operation.opId!,
                chainId,
                executedBy: await auth.getAddress(),
                entryPointAddress: await chain.getAddress("entryPointAddress"),
                signature: operation.userOp.signature as Hex,
                userOp: operation.userOp
            })
        }
        receipt = await getFullReceipt(operation.opId, chainId, receipt.userOpHash)
        if (isWalletInitOp(operation.userOp) && txOptions.skipDBAction !== true) {
            await addUserToWallet(auth.authId!, chainId, await this.getAddress(), Array.from(this.userInfo!.keys()), this.walletUniqueId)

            if (isGroupOperation(operation)) {
                const group = this.userInfo!.get(operation.groupId!)

                if (group && group.groupInfo) {
                    await createGroup(
                        operation.groupId!,
                        chainId,
                        group.groupInfo.threshold,
                        await this.getAddress(),
                        group.groupInfo.memberIds
                    )
                }
            }

            if (txOptions?.gasSponsor?.sponsorAddress) {
                const paymasterType = getPaymasterType(txOptions)
                addTransaction(
                    await chain.getChainId(),
                    Date.now(),
                    receipt.txId,
                    {
                        action: "sponsor",
                        amount: -1, //Get amount from lazy processing
                        from: txOptions.gasSponsor.sponsorAddress,
                        to: await this.getAddress(),
                        token: "eth",
                        txid: receipt.txId
                    },
                    paymasterType,
                    txOptions.gasSponsor.sponsorAddress
                )
            }
        }
        return receipt
    }

    /**
     * Schedules an operation for execution and returns the scheduled operation's ID.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {Operation} operation - The operation to be scheduled.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Hex>} The ID of the scheduled operation.
     */
    async scheduleOperation(auth: Auth, operation: Operation, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<Hex> {
        txOptions = parseOptions(txOptions)
        operation = Operation.convertTypeToObject(operation)
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const chainId = await chain.getChainId()

        if (txOptions.skipDBAction !== true) {
            // cache group info
            if (isGroupOperation(operation)) {
                const groups: GroupMetadata[] = await getGroups([operation.groupId!], chainId)
                if (groups && groups.length > 0) {
                    // could be empty as a new wallet wants to create a group
                    this.userInfo?.set(operation.groupId!, {
                        userId: operation.groupId!,
                        groupInfo: {
                            threshold: groups[0].threshold,
                            memberIds: groups[0].memberIds
                        }
                    })
                }
            }
        }

        const threshold: number = this.userInfo?.get(operation.groupId!)?.groupInfo?.threshold ?? 1

        if (threshold <= 1) {
            if (!operation.userOp.signature || operation.userOp.signature === "0x") {
                operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
            }
        } else {
            if (txOptions.skipDBAction !== true) {
                // check remote collected signature
                const storedOps = await getOps([operation.opId!], chainId)

                let collectedSigCount: number
                if (isSignatureMissing(await auth.getUserId(), storedOps[0]?.signatures)) {
                    collectedSigCount = storedOps[0]?.signatures?.length ? storedOps[0]?.signatures?.length + 1 : 1
                    if (collectedSigCount >= threshold) {
                        operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
                    }
                } else {
                    collectedSigCount = storedOps[0]?.signatures?.length ?? 1
                }

                if (collectedSigCount < threshold) {
                    throw new InvalidParameterError(
                        ErrorCode.InsufficientSignatures,
                        "Signatures are not sufficient to execute the operation",
                        { threshold, collectedSigCount, chainId },
                        "Only execute operation with enough signatures",
                        "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                    )
                }
            } else {
                throw new InvalidParameterError(
                    ErrorCode.InsufficientSignatures,
                    "Signatures are not sufficient to execute the operation",
                    { threshold, chainId, skipDBAction: txOptions.skipDBAction },
                    "Only execute operation with enough signatures",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                )
            }
        }

        if (isGroupOperation(operation)) {
            await scheduleOp({
                opId: operation.opId!,
                chainId,
                scheduledBy: await auth.getAddress(),
                entryPointAddress: await chain.getAddress("entryPointAddress"),
                signature: operation.userOp.signature as Hex,
                groupInfo: this.userInfo?.get(operation.groupId!)?.groupInfo
            })
        } else {
            await scheduleOp({
                opId: operation.opId!,
                chainId,
                scheduledBy: await auth.getAddress(),
                entryPointAddress: await chain.getAddress("entryPointAddress"),
                signature: operation.userOp.signature as Hex,
                userOp: operation.userOp
            })
        }
        if (!operation.opId) {
            throw new InternalFailureError(
                ErrorCode.ServerFailure,
                "Operation id is required",
                operation,
                "Make sure you are scheduling a valid operation",
                "https://docs.fun.xyz/"
            )
        }
        return operation.opId
    }

    /**
     * Removes an operation from the system using its ID.
     * @param {Auth} _ - The authentication instance (not used in this method).
     * @param {Hex} operationId - The ID of the operation to be removed.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<void>} A promise that resolves after the operation is removed.
     */
    async removeOperation(_: Auth, operationId: Hex, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<void> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        await deleteOp(operationId, await chain.getChainId())
    }

    /**
     * Creates and prepares a rejection operation for an existing operation.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} groupId - The ID of the group to which the operation belongs.
     * @param {Operation} operation - The operation to be rejected.
     * @param {string} rejectionMessage - Optional rejection message.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The prepared rejection operation.
     */
    async createRejectOperation(
        auth: Auth,
        groupId: string,
        operation: Operation,
        rejectionMessage?: string,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ) {
        const rejectOperation = await this.transfer(
            auth,
            groupId,
            { to: await this.getAddress(), amount: 0, token: "eth" },
            { ...txOptions, skipDBAction: true, nonce: BigInt(operation.userOp.nonce) }
        )
        if (rejectionMessage) rejectOperation.message = rejectionMessage
        rejectOperation.relatedOpIds = [operation.opId!]
        rejectOperation.opType = OperationType.REJECTION
        rejectOperation.opId = (await createOp(rejectOperation)) as Hex
        return rejectOperation
    }

    /**
     * Estimates the gas cost for executing an operation and returns the updated operation with gas estimation details.
     * @param {Auth} auth - The authentication instance for the user.
     * @param {string} userId - The ID of the user initiating the operation.
     * @param {Operation} operation - The operation for which to estimate gas.
     * @param {EnvOption} txOptions - Transaction environment options (default: global environment options).
     * @returns {Promise<Operation>} The updated operation with gas estimation details.
     */
    async estimateOperation(
        auth: Auth,
        userId: string,
        operation: Operation,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
        const estimateGasSignature = await auth.getEstimateGasSignature(userId, operation)
        operation.userOp.signature = estimateGasSignature.toLowerCase()
        const res = await chain.estimateOpGas(operation.userOp)
        operation.userOp = {
            ...operation.userOp,
            ...res
        }

        const maxFeePerGas = await chain.getFeeData()
        operation.userOp.maxFeePerGas = maxFeePerGas
        operation.userOp.maxPriorityFeePerGas = maxFeePerGas
        return operation
    }

    private async getThisInitCode(chain: Chain) {
        const owners: Hex[] = Array.from(this.userInfo!.keys())
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const factoryAddress = await chain.getAddress("factoryAddress")
        const rbac = await chain.getAddress("rbacAddress")
        const userAuth = await chain.getAddress("userAuthAddress")

        const loginData: LoginData = {
            salt: this.walletUniqueId!
        }

        const rbacInitData = toBytes32Arr(owners)

        let userAuthInitData = "0x" as Hex
        const groupUsers: User[] = Array.from(this.userInfo!.values()).filter(
            (user) => user.groupInfo !== null && user.groupInfo !== undefined
        )
        if (groupUsers.length > 0) {
            userAuthInitData = encodeUserAuthInitData(groupUsers)
        }

        const initCodeParams: InitCodeParams = {
            entryPointAddress,
            factoryAddress,
            implementationAddress: AddressZero,
            loginData: loginData,
            verificationAddresses: [rbac, userAuth],
            verificationData: [rbacInitData, userAuthInitData]
        }

        return this.getInitCode(initCodeParams)
    }

    private getInitCode(input: InitCodeParams) {
        const encodedVerificationInitdata = encodeAbiParameters(
            [
                {
                    type: "address[]",
                    name: "verificationAddresses"
                },
                {
                    type: "bytes[]",
                    name: "verificationData"
                }
            ],
            [input.verificationAddresses, input.verificationData]
        )
        const initializerCallData = WALLET_CONTRACT_INTERFACE.encodeData("initialize", [
            input.entryPointAddress,
            encodedVerificationInitdata
        ])

        const data = FACTORY_CONTRACT_INTERFACE.encodeData("createAccount", [initializerCallData, encodeLoginData(input.loginData)])
        return concat([input.factoryAddress, data])
    }

    /**
     * Encodes arbitrary transactions calls to include fees
     * @param params Transaction Params, generated from various calldata generating functions
     * @param options EnvOptions to read fee data from
     * @returns calldata to be passed into createUserOperation
     */
    private async buildCalldata(auth: Auth, userId: string, params: TransactionParams, options: EnvOption): Promise<Hex> {
        if (!params.value) {
            params.value = 0n
        }
        if (options.fee) {
            if (!options.fee.token && options.gasSponsor && options.gasSponsor.token) {
                options.fee.token = options.gasSponsor.token
            }
            if (!options.fee.token) {
                throw new InvalidParameterError(
                    ErrorCode.MissingParameter,
                    "EnvOption.fee.token or EnvOption.gasSponsor.token is required",
                    { options },
                    "Provide EnvOption.fee.token or EnvOption.gasSponsor.token when calling wallet.createOperation",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                )
            }
            if (!options.fee.recipient) {
                throw new InvalidParameterError(
                    ErrorCode.MissingParameter,
                    "EnvOption.fee.recipient is required",
                    { options },
                    "Provide EnvOption.fee.recipient when calling wallet.createOperation",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                )
            }
            const token = new Token(options.fee.token)
            if (options.fee.gasPercent && !token.isNative) {
                throw new InvalidParameterError(
                    ErrorCode.InvalidParameterCombination,
                    "GasPercent is only valid for native tokens",
                    { options },
                    "Use native token as the fee token if you want to charge fee based on percentage",
                    "https://docs.fun.xyz/how-to-guides/configure-environment/set-developer-fee"
                )
            }

            if (token.isNative) {
                options.fee.token = AddressZero
            } else {
                options.fee.token = await token.getAddress()
            }

            if (options.fee.amount) {
                options.fee.amount = Number(await token.getDecimalAmount(options.fee.amount))
            } else if (options.fee.gasPercent) {
                const feedata = [options.fee.token, options.fee.recipient, 1]
                const estimateGasCalldata = WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPointWithFee", [
                    params.to,
                    params.value,
                    params.data,
                    feedata
                ])
                const operation = await this.createOperation(
                    auth,
                    userId,
                    { to: params.to, value: params.value, data: estimateGasCalldata },
                    { ...options, fee: undefined }
                )
                const gasUsed = await operation.getMaxTxCost()
                options.fee.amount = Math.ceil((Number(gasUsed) * options.fee.gasPercent) / 100)
            } else {
                throw new InvalidParameterError(
                    ErrorCode.MissingParameter,
                    "EnvOption.fee.amount or EnvOption.fee.gasPercent is required",
                    { options },
                    "Provide either EnvOption.fee.amount or EnvOption.fee.gasPercent when calling wallet.createOperation",
                    "https://docs.fun.xyz/how-to-guides/configure-environment/set-developer-fee"
                )
            }
            const feedata = [options.fee.token, options.fee.recipient, options.fee.amount]
            return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPointWithFee", [params.to, params.value, params.data, feedata])
        } else {
            return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, params.value, params.data])
        }
    }
}
