import { Address, Hex } from "viem"
import { FirstClassActions } from "../actions/FirstClassActions"
import { getAllNFTs, getAllTokens, getLidoWithdrawals, getNFTs, getTokens, storeUserOp } from "../apis"
import { addTransaction } from "../apis/PaymasterApis"
import { Auth } from "../auth"
import { ENTRYPOINT_CONTRACT_INTERFACE, ExecutionReceipt } from "../common"
import { AddressZero } from "../common/constants"
import { EnvOption, parseOptions } from "../config"
import {
    Chain,
    InitCodeParams,
    LoginData,
    UserOp,
    UserOperation,
    WalletIdentifier,
    addresstoBytes32,
    getChainFromData,
    toBytes32Arr
} from "../data"
import { WalletAbiManager, WalletOnChainManager } from "../managers"
import { GaslessSponsor, TokenSponsor } from "../sponsors"
import { gasCalculation, getUniqueId } from "../utils"
import { getPaymasterType } from "../utils/PaymasterUtils"
export interface FunWalletParams {
    uniqueId: string
    index?: number
}

export class FunWallet extends FirstClassActions {
    identifier: WalletIdentifier
    abiManager: WalletAbiManager
    address?: Address

    /**
     * Creates FunWallet object
     * @constructor
     * @param {object} params - The parameters for the WalletIdentifier - uniqueId, index
     */
    constructor(params: FunWalletParams) {
        super()
        const { uniqueId, index } = params
        this.identifier = new WalletIdentifier(uniqueId, index)
        this.abiManager = new WalletAbiManager()
    }

    // /**
    //  * Generates UserOp object for a transaction
    //  * @param {Auth} auth Auth class instance that signs the transaction
    //  * @param {function} transactionFunc Function that returns the data to be used in the transaction
    //  * @param {Object} txOptions Options for the transaction
    //  * @returns {UserOp}
    //  */
    // async _generatePartialUserOp(auth: Auth, transactionFunc: ActionFunction, txOptions: EnvOption) {
    //     const chain = await getChainFromData(txOptions.chain)
    //     const actionData: ActionData = {
    //         wallet: this,
    //         chain,
    //         options: txOptions
    //     }
    //     const { data } = await transactionFunc(actionData)

    //     const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

    //     const sender = await this.getAddress({ chain })
    //     const callData = await this._getCallData(onChainDataManager, data, auth, txOptions)
    //     const maxFeePerGas = await chain.getFeeData()
    //     const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : await this._getThisInitCode(chain, auth)
    //     let paymasterAndData = "0x"
    //     if (txOptions.gasSponsor) {
    //         if (txOptions.gasSponsor.token) {
    //             const sponsor = new TokenSponsor(txOptions)
    //             paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
    //         } else {
    //             const sponsor = new GaslessSponsor(txOptions)
    //             paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
    //         }
    //     }

    //     const partialOp = {
    //         callData,
    //         paymasterAndData,
    //         sender,
    //         maxFeePerGas: maxFeePerGas!,
    //         maxPriorityFeePerGas: maxFeePerGas!,
    //         initCode
    //     }
    //     const nonce = await auth.getNonce(partialOp.sender)
    //     return { ...partialOp, nonce }
    // }

    // async _getCallData(onChainDataManager: WalletOnChainManager, data: TransactionData, auth: Auth, options: EnvOption) {
    //     const fee = { ...options.fee }
    //     if (options.fee) {
    //         if (!(fee.token || (options.gasSponsor && options.gasSponsor.token))) {
    //             const helper = new Helper("Fee", fee, "fee.token or gasSponsor.token is required")
    //             throw new ParameterFormatError("Wallet.execute", helper)
    //         }
    //         if (!fee.token && options.gasSponsor && options.gasSponsor.token) {
    //             fee.token = options.gasSponsor.token
    //         }

    //         const token = new Token(fee.token!)
    //         if (token.isNative) {
    //             fee.token = AddressZero
    //         } else {
    //             fee.token = await token.getAddress()
    //         }

    //         if (fee.amount) {
    //             fee.amount = Number(await token.getDecimalAmount(fee.amount))
    //         } else if (fee.gasPercent) {
    //             if (!token.isNative) {
    //                 throw new Error("gasPercent is not supported for ERC20 tokens")
    //             }
    //             const emptyFunc = async () => {
    //                 return {
    //                     data,
    //                     errorData: { location: "Wallet.execute" }
    //                 }
    //             }
    //             const estimateGasOptions = options
    //             estimateGasOptions.fee = undefined
    //             const actualGas = await this.estimateGas(auth, emptyFunc, estimateGasOptions)
    //             let eth = actualGas.getMaxTxCost()

    //             let percentNum = BigInt(fee.gasPercent)
    //             let percentBase = 100n
    //             while (percentNum % 1n !== 0n) {
    //                 percentNum *= 10n
    //                 percentBase *= 10n
    //             }

    //             if (!token.isNative) {
    //                 const ethTokenPairing = await onChainDataManager.getEthTokenPairing(fee.token!)
    //                 const decimals = await token.getDecimals()
    //                 const numerator = BigInt(10) ** decimals
    //                 const denominator = BigInt(10) ** 18n // eth decimals
    //                 const price = (ethTokenPairing * numerator) / denominator
    //                 eth = (price * numerator) / ((eth * percentNum) / percentBase)
    //             } else {
    //                 eth = (eth * percentNum) / percentBase
    //             }

    //             fee.amount = Number(eth)
    //         } else {
    //             const helper = new Helper("Fee", fee, "fee.amount or fee.gasPercent is required")
    //             throw new ParameterFormatError("Wallet.execute", helper)
    //         }
    //     }

    //     return this.abiManager.encodeCall({ ...data, ...fee })
    // }

    // /**
    //  * Executes UserOp
    //  * @param {Auth} auth Auth class instance that signs the transaction
    //  * @param {function} transactionFunc Function that returns the data to be used in the transaction
    //  * @param {Object} txOptions Options for the transaction
    //  * @param {bool} estimate Whether to estimate gas or not
    //  * @returns {UserOp || receipt}
    //  */
    // async execute(
    //     auth: Auth,
    //     transactionFunc: ActionFunction,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption,
    //     estimate = false
    // ): Promise<ExecutionReceipt | UserOp | bigint> {
    //     const options = parseOptions(txOptions)
    //     const chain = await getChainFromData(options.chain)
    //     const estimatedOp = await this.estimateGas(auth, transactionFunc, options)
    //     if (estimate) {
    //         return estimatedOp.getMaxTxCost()
    //     }
    //     estimatedOp.op.signature = await auth.signOp(estimatedOp, chain)
    //     if (txOptions.sendTxLater) {
    //         return estimatedOp
    //     }
    //     return await this.sendTx(estimatedOp, options)
    // }

    // /**
    //  * Estimates gas for a transaction
    //  * @param {Auth} auth Auth class instance that signs the transaction
    //  * @param {function} transactionFunc Function that returns the data to be used in the transaction
    //  * @param {Options} txOptions Options for the transaction
    //  * @returns
    //  */
    // estimateGas = async (
    //     auth: Auth,
    //     transactionFunc: ActionFunction,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> => {
    //     const chain = await getChainFromData(txOptions.chain)
    //     const partialOp = await this._generatePartialUserOp(auth, transactionFunc, txOptions)
    //     const signature = await auth.getEstimateGasSignature()
    //     const estimateOp: UserOperation = {
    //         ...partialOp,
    //         signature: signature.toLowerCase(),
    //         preVerificationGas: 100_000n,
    //         callGasLimit: BigInt(10e6),
    //         verificationGasLimit: BigInt(10e6)
    //     }
    //     const res = await chain.estimateOpGas(estimateOp)

    //     return new UserOp({
    //         ...partialOp,
    //         ...res,
    //         signature
    //     })
    // }

    async _getThisInitCode(chain: Chain, auth: Auth) {
        const owners = await auth.getOwnerAddr()
        const uniqueId = await this.identifier.getIdentifier()
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const factoryAddress = await chain.getAddress("factoryAddress")
        const rbac = await chain.getAddress("rbacAddress")
        const userAuth = await chain.getAddress("userAuthAddress")
        const loginData: LoginData = {
            salt: uniqueId
        }
        const rbacInitData = toBytes32Arr(owners.map((owner: Address) => addresstoBytes32(owner)))
        const userAuthInitData = "0x"
        const initCodeParams: InitCodeParams = {
            entryPointAddress,
            factoryAddress,
            implementationAddress: AddressZero,
            loginData: loginData,
            verificationAddresses: [rbac, userAuth],
            verificationData: [rbacInitData, userAuthInitData]
        }

        return this.abiManager.getInitCode(initCodeParams)
    }

    /**
     * Returns the wallet address
     * @param {*} options
     * @returns
     */
    async getAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        if (!this.address) {
            const chain = await getChainFromData(options.chain)
            this.address = await new WalletOnChainManager(chain, this.identifier).getWalletAddress()
        }
        return this.address!
    }

    static async getAddress(authId: string, index: number, chain: string | number, apiKey: string): Promise<string> {
        ;(globalThis as any).globalEnvOption.apiKey = apiKey
        const uniqueId = await getUniqueId(authId)
        const chainObj = await getChainFromData(chain.toString())
        const walletIdentifer = new WalletIdentifier(uniqueId, index)
        const walletOnChainManager = new WalletOnChainManager(chainObj, walletIdentifer)
        return await walletOnChainManager.getWalletAddress()
    }

    static async getAddressOffline(uniqueId: string, index: number, rpcUrl: string, factoryAddress: Address) {
        //offline query
        const walletIdentifer = new WalletIdentifier(uniqueId, index)
        const identifier = await walletIdentifer.getIdentifier()
        return await WalletOnChainManager.getWalletAddress(identifier, rpcUrl, factoryAddress)
    }

    async sendTx(userOp: UserOp, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt> {
        return await this.sendUserOp(userOp.op, txOptions)
    }

    /**
     * Sends a UserOp to the bundler
     * @param {UserOp} userOp
     * @param {Options} txOptions Options for the transaction
     * @returns
     */
    async sendUserOp(userOp: UserOperation, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt> {
        const chain = await getChainFromData(txOptions.chain)
        await chain.sendOpToBundler(userOp)
        const opHash = await new UserOp(userOp).getOpHashData(chain)
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

        let txid
        try {
            txid = await onChainDataManager.getTxId(opHash)
        } catch (e) {
            txid = "Cannot find transaction hash."
        }

        if (!txid) throw new Error("Txid not found")
        const { gasUsed, gasUSD } = await gasCalculation(txid!, chain)
        if (!(gasUsed || gasUSD)) throw new Error("Txid not found")

        const receipt: ExecutionReceipt = {
            opHash,
            txid,
            gasUsed,
            gasUSD
        }
        await storeUserOp(userOp, 0, receipt)

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
        return receipt
    }

    /**
     *
     * @param {Auth?} auth Optional Auth class instance that signs the transaction if not already signed
     * @param {UserOp[]} ops list of UserOps to be sent
     * @param {*} txOptions
     * @returns
     */
    async sendTxs(ops: UserOp[], txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt[]> {
        const receipts: ExecutionReceipt[] = []
        for (const op of ops) {
            const receipt = await this.sendTx(op, txOptions)
            receipts.push(receipt)
        }
        return receipts
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
        return await getTokens(chain.chainId!, await this.getAddress(), onlyVerifiedTokens)
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
        return await getNFTs(chain.chainId!, await this.getAddress())
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
        return { tokens, nfts }
    }

    // async generateUserOp(auth: Auth, callData: Hex, txOptions: EnvOption = (globalThis as any).globalEnvOption) {
    //     const chain = await getChainFromData(txOptions.chain)
    //     const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

    //     const sender = await this.getAddress({ chain })
    //     const maxFeePerGas = await chain.getFeeData()
    //     const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : await this._getThisInitCode(chain, auth)
    //     let paymasterAndData = "0x"
    //     if (txOptions.gasSponsor) {
    //         if (txOptions.gasSponsor.token) {
    //             const sponsor = new TokenSponsor(txOptions)
    //             paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
    //         } else {
    //             const sponsor = new GaslessSponsor(txOptions)
    //             paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
    //         }
    //     }

    //     const partialOp = {
    //         callData,
    //         paymasterAndData,
    //         sender,
    //         maxFeePerGas: maxFeePerGas!,
    //         maxPriorityFeePerGas: maxFeePerGas!,
    //         initCode,
    //         nonce: await auth.getNonce(sender)
    //     }
    //     const signature = await auth.getEstimateGasSignature()
    //     const estimateOp: UserOperation = {
    //         ...partialOp,
    //         signature: signature.toLowerCase(),
    //         preVerificationGas: 100_000n,
    //         callGasLimit: BigInt(10e6),
    //         verificationGasLimit: BigInt(10e6)
    //     }
    //     const res = await chain.estimateOpGas(estimateOp)
    //     const estimatedOp = new UserOp({
    //         ...partialOp,
    //         ...res,
    //         signature
    //     })
    //     estimatedOp.op.signature = await auth.signOp(estimatedOp, chain)
    //     return await this.sendTx(estimatedOp, parseOptions(txOptions))
    // }

    async getNonce(sender: string, key = 0, option: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(option.chain)
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        return BigInt(await ENTRYPOINT_CONTRACT_INTERFACE.readFromChain(entryPointAddress, "getNonce", [sender, key], chain))
    }

    async createOperation(
        auth: Auth,
        _: string, //userId - left unused for @Chazzzzzzz to implement
        callData: Hex,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const chain = await getChainFromData(txOptions.chain)
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

        const sender = await this.getAddress({ chain })
        const maxFeePerGas = await chain.getFeeData()
        const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : await this._getThisInitCode(chain, auth)
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
            callData,
            paymasterAndData,
            sender,
            maxFeePerGas: maxFeePerGas!,
            maxPriorityFeePerGas: maxFeePerGas!,
            initCode,
            nonce: await auth.getNonce(sender)
        }
        const signature = await auth.getEstimateGasSignature()
        const estimateOp: UserOperation = {
            ...partialOp,
            signature: signature.toLowerCase(),
            preVerificationGas: 100_000n,
            callGasLimit: BigInt(10e6),
            verificationGasLimit: BigInt(10e6)
        }
        return new UserOp(estimateOp)
    }

    async signOperation(auth: Auth, userOp: UserOp, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const chain = await getChainFromData(txOptions.chain)
        const signature = await auth.getEstimateGasSignature()

        const res = await chain.estimateOpGas(userOp.op)
        const estimatedOp = new UserOp({
            ...userOp.op,
            ...res,
            signature
        })
        estimatedOp.op.signature = await auth.signOp(estimatedOp, chain)
        return estimatedOp
    }

    async executeOperation(_: Auth, userOp: UserOp, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt> {
        userOp = await this.signOperation(_, userOp, txOptions)
        return await this.sendTx(userOp, parseOptions(txOptions))
    }

    async estimateOperation(_: Auth, userOp: UserOp, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const chain = await getChainFromData(txOptions.chain)
        const res = await chain.estimateOpGas(userOp.op)
        const estimatedOp = new UserOp({
            ...userOp.op,
            ...res
        })
        return estimatedOp
    }
}
