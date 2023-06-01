import { BigNumber, constants } from "ethers"
import wallet from "../abis/FunWallet.json"
import factory from "../abis/FunWalletFactory.json"
import { ExecutionReceipt, FirstClassActions } from "../actions"
import { getAllNFTs, getAllTokens, getLidoWithdrawals, getNFTs, getTokens, storeUserOp } from "../apis"
import { Auth } from "../auth"
import { EnvOption, GlobalEnvOption } from "../config"
import { Chain, Token, UserOp, UserOperation, WalletIdentifier, getChainFromData } from "../data"
import { Helper, ParameterFormatError } from "../errors"
import { WalletAbiManager, WalletOnChainManager } from "../managers"
import { GaslessSponsor, TokenSponsor } from "../sponsors"
import { gasCalculation, getUniqueId } from "../utils"

export interface FunWalletParams {
    uniqueId: string
    index?: number
}

export class FunWallet extends FirstClassActions {
    identifier: WalletIdentifier
    abiManager: WalletAbiManager
    address?: string

    /**
     * Creates FunWallet object
     * @constructor
     * @param {object} params - The parameters for the WalletIdentifier - uniqueId, index
     */
    constructor(params: FunWalletParams) {
        super()
        const { uniqueId, index } = params
        this.identifier = new WalletIdentifier(uniqueId, index)
        this.abiManager = new WalletAbiManager(wallet.abi, factory.abi)
    }

    /**
     * Generates UserOp object for a transaction
     * @param {Auth} auth Auth class instance that signs the transaction
     * @param {function} transactionFunc Function that returns the data to be used in the transaction
     * @param {Object} txOptions Options for the transaction
     * @returns {UserOp}
     */
    async _generatePartialUserOp(auth: Auth, transactionFunc: Function, txOptions: GlobalEnvOption = (globalThis as any).globalEnvOption) {
        const chain = await getChainFromData(txOptions.chain)
        const actionData = {
            wallet: this,
            chain,
            txOptions
        }
        const { data, optionalParams } = await transactionFunc(actionData)

        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

        const sender = await this.getAddress({ chain })
        const callData = await this._getCallData(onChainDataManager, data, sender, auth, txOptions)
        const { maxFeePerGas, maxPriorityFeePerGas } = await chain.getFeeData()

        const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : await this._getThisInitCode(chain, auth)
        let paymasterAndData = "0x"
        if (txOptions.gasSponsor) {
            let sponsor
            // gas payment method check
            if (txOptions.gasSponsor.token) {
                sponsor = new TokenSponsor(txOptions)
            } else {
                sponsor = new GaslessSponsor(txOptions)
            }
            paymasterAndData = (await sponsor.getPaymasterAndData(txOptions)).toLowerCase()
        }

        const partialOp = { callData, paymasterAndData, sender, maxFeePerGas, maxPriorityFeePerGas, initCode, ...optionalParams }
        const nonce = await auth.getNonce(partialOp.sender)
        return { ...partialOp, nonce }
    }

    async _getCallData(onChainDataManager: WalletOnChainManager, data: any, sender: string, auth: Auth, options: GlobalEnvOption) {
        let tempCallData
        const fee = { ...options.fee }
        if (options.fee) {
            if (!(fee.token || (options.gasSponsor && options.gasSponsor.token))) {
                const helper = new Helper("Fee", fee, "fee.token or gasSponsor.token is required")
                throw new ParameterFormatError("Wallet.execute", helper)
            }
            if (!fee.token && options.gasSponsor && options.gasSponsor.token) {
                fee.token = options.gasSponsor.token
            }

            const token = new Token(fee.token!)
            if (token.isNative) {
                fee.token = constants.AddressZero
            } else {
                fee.token = await token.getAddress()
            }

            if (fee.amount) {
                fee.amount = (await token.getDecimalAmount(fee.amount)).toNumber()
            } else if (fee.gasPercent) {
                const emptyFunc = async () => {
                    return {
                        data,
                        errorData: { location: "Wallet.execute" }
                    }
                }
                const estimateGasOptions = options
                estimateGasOptions.fee = undefined
                const actualGas = await this.estimateGas(auth, emptyFunc, estimateGasOptions)
                let eth = actualGas.getMaxTxCost()

                let percentNum = fee.gasPercent
                let percentBase = 100
                while (percentNum % 1 !== 0) {
                    percentNum *= 10
                    percentBase *= 10
                }

                if (!token.isNative) {
                    const ethTokenPairing = await onChainDataManager.getEthTokenPairing(fee.token!)
                    const decimals = await token.getDecimals()
                    const numerator = BigNumber.from(10).pow(decimals)
                    const denominator = BigNumber.from(10).pow(18) // eth decimals
                    const price = ethTokenPairing.mul(numerator).div(denominator)
                    eth = price.mul(numerator).div(eth).mul(percentNum).div(percentBase)
                }

                fee.amount = eth.toNumber()
            } else {
                const helper = new Helper("Fee", fee, "fee.amount or fee.gasPercent is required")
                throw new ParameterFormatError("Wallet.execute", helper)
            }
            fee.oracle = await onChainDataManager.chain.getAddress("FeePercentOracle")
        }
        data = { ...data, ...fee }
        if (data.initAndExec) {
            const moduleIsInit = await onChainDataManager.getModuleIsInit(sender, data.to)
            if (!moduleIsInit) {
                tempCallData = this.abiManager.encodeInitExecCall(data)
            } else {
                tempCallData = this.abiManager.encodeCall(data)
            }
        } else {
            tempCallData = this.abiManager.encodeCall(data)
        }
        return tempCallData
    }

    /**
     * Executes UserOp
     * @param {Auth} auth Auth class instance that signs the transaction
     * @param {function} transactionFunc Function that returns the data to be used in the transaction
     * @param {Object} txOptions Options for the transaction
     * @param {bool} estimate Whether to estimate gas or not
     * @returns {UserOp || receipt}
     */
    async execute(
        auth: Auth,
        transactionFunc: Function,
        txOptions: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        const chain = await getChainFromData(txOptions.chain)
        const estimatedOp = await this.estimateGas(auth, transactionFunc, txOptions)
        if (estimate) {
            return estimatedOp
        }
        await estimatedOp.sign(auth, chain)
        if (txOptions.sendTxLater) {
            return estimatedOp
        }
        return await this.sendTx(estimatedOp, txOptions)
    }

    /**
     * Estimates gas for a transaction
     * @param {Auth} auth Auth class instance that signs the transaction
     * @param {function} transactionFunc Function that returns the data to be used in the transaction
     * @param {Options} txOptions Options for the transaction
     * @returns
     */
    async estimateGas(auth: Auth, transactionFunc: Function, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const chain = await getChainFromData(txOptions.chain)
        const partialOp = await this._generatePartialUserOp(auth, transactionFunc, txOptions)
        const signature = await auth.getEstimateGasSignature()
        const res = await chain.estimateOpGas({
            ...partialOp,
            signature: signature.toLowerCase(),
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            preVerificationGas: 0,
            callGasLimit: 0,
            verificationGasLimit: 10e6
        })

        return new UserOp(
            partialOp.sender,
            partialOp.nonce,
            partialOp.callData,
            res.callGasLimit,
            res.verificationGasLimit,
            partialOp.maxFeePerGas,
            partialOp.maxPriorityFeePerGas,
            partialOp.initCode,
            res.preVerificationGas,
            partialOp.paymasterAndData,
            signature
        )
    }

    async _getThisInitCode(chain: Chain, auth: Auth) {
        const owner = await auth.getOwnerAddr()
        const uniqueId = await this.identifier.getIdentifier()
        const entryPointAddress = await chain.getAddress("EntryPoint")
        const factoryAddress = await chain.getAddress("FunWalletFactory")
        const verificationAddress = await chain.getAddress("UserAuthentication")
        const initCodeParams = { uniqueId, owner, entryPointAddress, verificationAddress, factoryAddress }
        return this.abiManager.getInitCode(initCodeParams)
    }

    /**
     * Returns the wallet address
     * @param {*} options
     * @returns
     */
    async getAddress(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        if (!this.address) {
            const chain = await getChainFromData(options.chain)
            this.address = await new WalletOnChainManager(chain, this.identifier).getWalletAddress()
        }
        return this.address!
    }

    static async getAddress(authId: string, index: number, chain: string | number, apiKey: string): Promise<string> {
        globalEnvOption.apiKey = apiKey
        const uniqueId = await getUniqueId(authId)
        const chainObj = await getChainFromData(chain)
        const walletIdentifer = new WalletIdentifier(uniqueId, index)
        const walletOnChainManager = new WalletOnChainManager(chainObj, walletIdentifer)
        return await walletOnChainManager.getWalletAddress()
    }

    static async getAddressOffline(uniqueId: string, index: number, rpcUrl: string, factoryAddress: string) {
        //offline query
        const walletIdentifer = new WalletIdentifier(uniqueId, index)
        const identifier = await walletIdentifer.getIdentifier()
        return await WalletOnChainManager.getWalletAddress(identifier, rpcUrl, factoryAddress)
    }

    async sendTx(userOp: UserOp, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt> {
        // let userOp
        // try {
        //     console.log()
        //     userOp = new UserOp(op)
        // } catch (e) {
        //     if (typeof call == "function") {
        //         call = await call(options)
        //     }
        //     const { to, value, data } = call
        //     return await this.execute(auth, genCall({ to, value, data }), txOptions)
        // }
        return await this.sendUserOp(userOp.op, txOptions)
    }

    /**
     * Sends a UserOp to the bundler
     * @param {UserOp} userOp
     * @param {Options} txOptions Options for the transaction
     * @returns
     */
    async sendUserOp(userOp: UserOperation, txOptions: GlobalEnvOption = (globalThis as any).globalEnvOption): Promise<ExecutionReceipt> {
        const chain = await getChainFromData(txOptions.chain)
        const opHash = await chain.sendOpToBundler(userOp)
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)
        const txid = await onChainDataManager.getTxId(opHash)
        const { gasUsed, gasUSD } = await gasCalculation(txid!, chain)
        const receipt: ExecutionReceipt = {
            opHash,
            txid,
            gasUsed,
            gasUSD
        }
        await storeUserOp(userOp, 0, receipt)
        return receipt
    }

    /**
     *
     * @param {Auth?} auth Optional Auth class instance that signs the transaction if not already signed
     * @param {UserOp[]} ops list of UserOps to be sent
     * @param {*} txOptions
     * @returns
     */
    // TODO: implement this
    // async sendTxs({ auth, ops }, txOptions = globalEnvOption) {
    //     const receipts = []
    //     for (let op of ops) {
    //         let receipt = await this.sendTx({ auth, op }, txOptions)
    //         receipts.push(receipt)
    //     }
    //     return receipts
    // }

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
    async getNFTs(txOptions = globalEnvOption) {
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
    async getAssets(onlyVerifiedTokens = false, status = false, txOptions = globalEnvOption) {
        if (status) {
            const chain = await getChainFromData(txOptions.chain)
            return await getLidoWithdrawals(chain.chainId!, await this.getAddress())
        }
        const tokens = await getAllTokens(await this.getAddress(), onlyVerifiedTokens)
        const nfts = await getAllNFTs(await this.getAddress())
        return { tokens, nfts }
    }
}
