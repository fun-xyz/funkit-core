import { Address, Hex, concat, createPublicClient, encodeAbiParameters, http, keccak256, pad, toBytes } from "viem"
import { User } from "./types"
import { FirstClassActions } from "../actions/FirstClassActions"
import { getAllNFTs, getAllTokens, getLidoWithdrawals, getNFTs, getTokens } from "../apis"
import { createGroup, getGroups } from "../apis/GroupApis"
import { createOp, deleteOp, executeOp, getOps, getOpsOfWallet, signOp } from "../apis/OperationApis"
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
    getChainFromData,
    toBytes32Arr
} from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"
import { GaslessSponsor, TokenSponsor } from "../sponsors"
import {
    gasCalculation,
    generateRandomNonce,
    getAuthUniqueId,
    getWalletAddress,
    isGroupOperation,
    isSignatureRequired,
    isWalletInitOp
} from "../utils"
import { getPaymasterType } from "../utils/PaymasterUtils"
export interface FunWalletParams {
    users?: User[]
    uniqueId?: string
    walletAddr?: Address
}

export class FunWallet extends FirstClassActions {
    walletUniqueId?: Hex
    userInfo?: Map<Hex, User>
    address?: Address

    /**
     * Creates FunWallet object
     * @constructor
     * @param {object} params - The parameters for the constructing fun wallet - users, uniqueId, walletAddr
     */
    constructor(params: FunWalletParams) {
        super()
        const { users, uniqueId, walletAddr } = params

        if (!(uniqueId && users && users.length > 0) && !walletAddr) {
            throw new InvalidParameterError(
                ErrorCode.MissingParameter,
                "(uniqueId, users) or walletAddr is required",
                "FunWallet.constructor",
                params,
                "Provide either (uniqueId, users) or walletAddr when constructing FunWallet",
                "https://docs.fun.xyz/how-to-guides/execute-transactions/create-funwallet#create-funwallet-manual-funwallet-creation"
            )
        }

        this.userInfo = new Map(
            users?.map((user) => {
                return [pad(user.userId, { size: 32 }), user] as [Hex, User]
            })
        )

        if (uniqueId) {
            this.walletUniqueId = keccak256(toBytes(uniqueId))
        } else {
            this.address = walletAddr
        }
    }

    /**
     * Returns the wallet address
     * @param {*} options
     * @returns
     */
    async getAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        if (!this.address) {
            const chain = await getChainFromData(options.chain)
            this.address = await getWalletAddress(chain, this.walletUniqueId!)
        }
        return this.address!
    }

    static async getAddress(authId: string, index: number, chain: string | number, apiKey: string): Promise<Address> {
        ;(globalThis as any).globalEnvOption.apiKey = apiKey
        const chainObj = await getChainFromData(chain.toString())
        const authUniqueId = await getAuthUniqueId(authId, await chainObj.getChainId())
        const walletUniqueId = keccak256(toBytes(`${authUniqueId}-${index}`))
        return await getWalletAddress(chainObj, walletUniqueId)
    }

    static async getAddressOffline(uniqueId: string, index: number, rpcUrl: string, factoryAddress: Address) {
        const walletUniqueId = keccak256(toBytes(`${uniqueId}-${index}`))
        const client = await createPublicClient({
            transport: http(rpcUrl)
        })
        return await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "getAddress", [walletUniqueId], client)
    }

    /**
     * Get all tokens for a specific chain
     * @param {string} chainId https://chainlist.org/
     * @param {string} address defaults to the fun wallet address
     * @param {string} onlyVerifiedTokens If true, only return alchemy tokens that are verified(filters spam) - defaults to false
     * @returns JSON
     * {
     *    "0xTokenAddress": {
     *        "tokenBalance": "0x00001",
     *        "symbol": "USDC",
     *        "decimals": 6,
     *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
     *        "price": 1.0001,
     *     }
     * }
     */
    async getTokens(onlyVerifiedTokens = false, txOptions: EnvOption = (globalThis as any).globalEnvOption) {
        const chain = await getChainFromData(txOptions.chain)
        return await getTokens(await chain.getChainId(), await this.getAddress(), onlyVerifiedTokens)
    }

    /**
     * Given an address and a chain, returns all NFTs owned by that address
     * @param {string} chainId Use the string version of the chainId
     * @param {string} address Defaults to this fun wallet address
     * @returns array
     * [
     *     {
     *       "address": "string",
     *       "token_id": "string",
     *       "floor_price": "string",
     *     }
     *  ]
     */
    async getNFTs(txOptions: EnvOption = (globalThis as any).globalEnvOption) {
        const chain = await getChainFromData(txOptions.chain)
        return await getNFTs(await chain.getChainId(), await this.getAddress())
    }

    /**
     * Return all NFTs on all supported chains.
     * @param {*} address
     * @param {*} onlyVerifiedTokens
     * @returns JSON
     * {
     *  "chainId": [
     *     {
     *       "address": "string",
     *       "token_id": "string",
     *       "floor_price": "string",
     *     }
     *   ]
     * }
     */
    async getAllNFTs() {
        return await getAllNFTs(await this.getAddress())
    }

    /**
     * Get all tokens on all supported chains. Merge tokens by symbol
     * @param {*} address String, leave null if you want getAllTokens on the instance of this Funwallet
     * @param {*} onlyVerifiedTokens true if you want to filter out spam tokens(Uses alchemy lists)
     * @returns JSON of all tokens owned by address
     * {
     *    1: {
     *      "0xTokenAddress": {
     *        "tokenBalance": "0x00001",
     *        "symbol": "USDC",
     *        "decimals": 6,
     *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
     *        "price": 1.0001,
     *     }
     *   }
     * }
     */
    async getAllTokens(onlyVerifiedTokens = false) {
        return await getAllTokens(await this.getAddress(), onlyVerifiedTokens)
    }

    /**
     * Get all tokens on all supported chains. Merge tokens by symbol
     * @param {*} address String, leave null if you want getAllTokens on the instance of this Funwallet
     * @param {*} onlyVerifiedTokens true if you want to filter out spam tokens(Uses alchemy lists)
     * @returns JSON of all tokens owned by address
     * {
     *    1: {
     *      "0xTokenAddress": {
     *        "tokenBalance": "0x00001",
     *        "symbol": "USDC",
     *        "decimals": 6,
     *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
     *        "price": 1.0001,
     *     }
     *   }
     * }
     */
    async getAssets(onlyVerifiedTokens = false, status = false, txOptions: EnvOption = (globalThis as any).globalEnvOption) {
        if (status) {
            const chain = await getChainFromData(txOptions.chain)
            return await getLidoWithdrawals(await chain.getChainId(), await this.getAddress())
        }
        const tokens = await getAllTokens(await this.getAddress(), onlyVerifiedTokens)
        const nfts = await getAllNFTs(await this.getAddress())
        return { ...tokens, ...nfts }
    }

    async getNonce(sender: string, key = 0, option: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(option.chain)
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        let nonce = undefined
        let retryCount = 5
        while ((nonce === undefined || nonce === null) && retryCount > 0) {
            nonce = await ENTRYPOINT_CONTRACT_INTERFACE.readFromChain(entryPointAddress, "getNonce", [sender, key], chain)
            retryCount--
        }

        if (nonce !== undefined && nonce !== null) {
            return BigInt(nonce)
        } else {
            return BigInt(generateRandomNonce())
        }
    }

    async getOperations(
        status: OperationStatus = OperationStatus.ALL,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation[]> {
        const chain = await getChainFromData(txOptions.chain)
        return await getOpsOfWallet(await this.getAddress(), await chain.getChainId(), status)
    }

    async getOperation(opId: Hex, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<Operation> {
        const chain = await getChainFromData(txOptions.chain)
        return (await getOps([opId], await chain.getChainId()))[0]
    }

    async create(auth: Auth, userId: string, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt> {
        const transactionParams: TransactionParams = { to: await this.getAddress(txOptions), data: "0x", value: 0n }
        const operation: Operation = await this.createOperation(auth, userId, transactionParams, txOptions)
        const receipt = await this.executeOperation(auth, operation, txOptions)
        return receipt
    }

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
                "FunWallet.createOperation",
                { userId: userId },
                "Provide userId when createOperation",
                "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
            )
        }
        userId = pad(userId as Hex, { size: 32 })
        const chain = await getChainFromData(txOptions.chain)

        const sender = await this.getAddress({ chain })
        const maxFeePerGas = await chain.getFeeData()
        const initCode = (await chain.addressIsContract(sender)) ? "0x" : await this._getThisInitCode(chain)
        let paymasterAndData = "0x"
        if (txOptions.gasSponsor) {
            if (txOptions.gasSponsor.token) {
                const sponsor = new TokenSponsor(txOptions)
                paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
            } else {
                const sponsor = new GaslessSponsor(txOptions)
                paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
            }
        }

        const partialOp = {
            callData: await this._buildCalldata(auth, userId, transactionParams, txOptions),
            paymasterAndData,
            sender,
            maxFeePerGas: maxFeePerGas!,
            maxPriorityFeePerGas: maxFeePerGas!,
            initCode,
            nonce: await this.getNonce(sender),
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

        const estimatedOperation = await this.estimateOperation(auth, userId, operation, txOptions)

        // sign the userOp directly here as we do not have the opId yet
        estimatedOperation.userOp.signature = await auth.signOp(estimatedOperation, chain, isGroupOperation(operation))

        if (txOptions.skipDBAction !== true) {
            const opId = await createOp(estimatedOperation)
            estimatedOperation.opId = opId as Hex
        }

        return estimatedOperation
    }

    async signOperation(auth: Auth, operation: Operation, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<Operation> {
        const chain = await getChainFromData(txOptions.chain)
        operation = Operation.convertTypeToObject(operation)
        operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
        if (isGroupOperation(operation) && txOptions.skipDBAction !== true) {
            await signOp(operation.opId!, await chain.getChainId(), operation.userOp.signature as Hex, await auth.getAddress())
        }

        return operation
    }

    async executeOperation(
        auth: Auth,
        operation: Operation,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<ExecutionReceipt> {
        txOptions = parseOptions(txOptions)
        operation = Operation.convertTypeToObject(operation)
        const chain = await getChainFromData(txOptions.chain)
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

            const threshold = this.userInfo?.get(operation.groupId!)?.groupInfo?.threshold ?? 1

            // check remote collected signature
            const storedOps = await getOps([operation.opId!], chainId)
            let collectedSigCount = storedOps[0]?.signatures?.length ?? 0
            if (isSignatureRequired(await auth.getUserId(), storedOps[0]?.signatures)) {
                operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
                collectedSigCount += 1
            }

            if (collectedSigCount < threshold) {
                throw new InvalidParameterError(
                    ErrorCode.InsufficientSignatures,
                    "userId is required",
                    "FunWallet.executeOperation",
                    { threshold, collectedSigCount, chainId },
                    "Provide userId when createOperation",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                )
            }
        } else {
            operation.userOp.signature = await auth.signOp(operation, chain, isGroupOperation(operation))
        }

        if (isGroupOperation(operation)) {
            await executeOp({
                opId: operation.opId!,
                chainId,
                executedBy: await auth.getAddress(),
                entryPointAddress: await chain.getAddress("entryPointAddress"),
                signature: operation.userOp.signature as Hex,
                groupInfo: this.userInfo?.get(operation.groupId!)?.groupInfo
            })
        } else {
            await executeOp({
                opId: operation.opId!,
                chainId,
                executedBy: await auth.getAddress(),
                entryPointAddress: await chain.getAddress("entryPointAddress"),
                signature: operation.userOp.signature as Hex,
                userOp: operation.userOp
            })
        }

        const opHash = await operation.getOpHash(chain)

        let txid, gasUsed, gasUSD
        try {
            txid = await chain.getTxId(opHash)
            if (!txid || txid === "0x") {
                txid = "Cannot find transaction id."
            } else {
                const gasData = await gasCalculation(txid, chain)
                gasUsed = gasData.gasUsed
                gasUSD = gasData.gasUSD
            }
        } catch (e) {
            txid = "Cannot find transaction id."
        }

        const receipt: ExecutionReceipt = {
            opHash,
            txid,
            gasUsed,
            gasUSD
        }

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
                    txid,
                    {
                        action: "sponsor",
                        amount: -1, //Get amount from lazy processing
                        from: txOptions.gasSponsor.sponsorAddress,
                        to: await this.getAddress(),
                        token: "eth",
                        txid: txid
                    },
                    paymasterType,
                    txOptions.gasSponsor.sponsorAddress
                )
            }
        }
        return receipt
    }

    // TODO, use auth to do authentication
    async removeOperation(_: Auth, operationId: Hex, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<void> {
        const chain = await getChainFromData(txOptions.chain)
        await deleteOp(operationId, await chain.getChainId())
    }

    async createRejectOperation(
        auth: Auth,
        groupId: string,
        operation: Operation,
        rejectionMessage?: string,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ) {
        const rejectOperation = await this.transfer(auth, groupId, { to: await this.getAddress(), amount: 0 }, txOptions)
        if (rejectionMessage) rejectOperation.message = rejectionMessage
        rejectOperation.userOp.nonce = operation.userOp.nonce
        rejectOperation.relatedOpId = [operation.opId!]
        rejectOperation.opType = OperationType.REJECTION
        return rejectOperation
    }

    async estimateOperation(
        auth: Auth,
        userId: string,
        operation: Operation,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const chain = await getChainFromData(txOptions.chain)
        const estimateGasSignature = await auth.getEstimateGasSignature(userId, operation)
        operation.userOp.signature = estimateGasSignature.toLowerCase()
        const res = await chain.estimateOpGas(operation.userOp)
        operation.userOp = {
            ...operation.userOp,
            ...res
        }
        return operation
    }

    private async _getThisInitCode(chain: Chain) {
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
        return this._getInitCode(initCodeParams)
    }

    private _getInitCode(input: InitCodeParams) {
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

        const implementationAddress = input.implementationAddress ? input.implementationAddress : AddressZero

        const data = FACTORY_CONTRACT_INTERFACE.encodeData("createAccount", [
            initializerCallData,
            implementationAddress,
            encodeLoginData(input.loginData)
        ])
        return concat([input.factoryAddress, data])
    }

    /**
     * Encodes arbitrary transactions calls to include fees
     * @param params Transaction Params, generated from various calldata generating functions
     * @param options EnvOptions to read fee data from
     * @returns calldata to be passed into createUserOperation
     */
    private async _buildCalldata(auth: Auth, userId: string, params: TransactionParams, options: EnvOption): Promise<Hex> {
        if (options.fee) {
            if (!options.fee.token && options.gasSponsor && options.gasSponsor.token) {
                options.fee.token = options.gasSponsor.token
            }
            if (!options.fee.token || !options.fee.recipient) {
                throw new InvalidParameterError(
                    ErrorCode.MissingParameter,
                    "EnvOption.fee.token or EnvOption.gasSponsor.token is required",
                    "FunWallet.createOperation",
                    { options },
                    "Provide EnvOption.fee.token or EnvOption.gasSponsor.token when calling wallet.createOperation",
                    "https://docs.fun.xyz/how-to-guides/execute-transactions#execute-transactions"
                )
            }
            if (!options.fee.recipient) {
                throw new InvalidParameterError(
                    ErrorCode.MissingParameter,
                    "EnvOption.fee.recipient is required",
                    "FunWallet.createOperation",
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
                    "FunWallet.createOperation",
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
                    "FunWallet.createOperation",
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
