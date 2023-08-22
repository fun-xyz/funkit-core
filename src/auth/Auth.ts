import {
    Address,
    Hex,
    JsonRpcAccount,
    PrivateKeyAccount,
    TransactionReceipt,
    WalletClient,
    createWalletClient,
    custom,
    http,
    isHex,
    keccak256,
    pad,
    toBytes
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import * as chains from "viem/chains"
import { Wallet } from "../apis/types"
import { getUserWalletIdentities, getUserWalletsByAddr } from "../apis/UserApis"
import { TransactionData, TransactionParams, VALID_PRIVATE_KEY_LENGTH } from "../common"
import { EnvOption } from "../config"
import { Chain, Operation, WalletSignature, encodeWalletSignature } from "../data"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { getAuthUniqueId, getGasStation } from "../utils"
import { isBytes32 } from "../utils/TypeUtils"
import { convertProviderToClient, convertSignerToClient } from "../viem"
const gasSpecificChain = {
    "137": {
        gasStationUrl: "https://gasstation.polygon.technology/v2",
        backupPriorityFee: "1000", // 1000 gwei
        backupFee: "200" // 200 gwei
    }
}

const preProcessesChains: any = {}
for (const key in chains) {
    const chain = chains[key]
    preProcessesChains[chain.id] = key
}

preProcessesChains["36865"] = "funtestnet"
chains["funtestnet"] = {
    id: 36865,
    name: "Fun Testnet",
    network: "tenderly",
    nativeCurrency: { name: "ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [Array] }, public: { http: [Array] } }
}

export interface AuthInput {
    web2AuthId?: string
    client?: WalletClient
    privateKey?: string
    windowEth?: any
    rpc?: string
    provider?: any
    signer?: any
}

export class Auth {
    authId?: string
    signer?: PrivateKeyAccount | JsonRpcAccount
    client?: WalletClient
    inited = false
    account?: Address
    constructor(authInput: AuthInput) {
        if (authInput.web2AuthId) {
            this.authId = authInput.web2AuthId
        }

        if (authInput.client) {
            this.client = authInput.client
        } else if (authInput.windowEth) {
            this.client = createWalletClient({
                transport: custom(authInput.windowEth)
            })
        } else if (authInput.rpc) {
            this.client = createWalletClient({
                transport: http(authInput.rpc)
            })
        } else if (authInput.provider) {
            this.client = convertProviderToClient({ provider: authInput.provider })
        } else if (authInput.signer) {
            this.client = convertSignerToClient({ signer: authInput.signer })
        } else if (authInput.privateKey) {
            let privateKey: Hex
            if (isBytes32(authInput.privateKey)) {
                privateKey = authInput.privateKey as Hex
            } else if (!isHex(authInput.privateKey) && authInput.privateKey.length === VALID_PRIVATE_KEY_LENGTH) {
                privateKey = `0x${authInput.privateKey}`
            } else {
                throw new InvalidParameterError(
                    ErrorCode.InvalidParameter,
                    "privateKey is not a valid one",
                    "Auth.constructor",
                    authInput.privateKey,
                    "Provide valid privateKey string",
                    "https://docs.fun.xyz/how-to-guides/configure-account"
                )
            }
            this.signer = privateKeyToAccount(privateKey)
        } else {
            throw new InvalidParameterError(
                ErrorCode.MissingParameter,
                "valid authInput is required",
                "Auth.constructor",
                authInput,
                "Provide viem client, privateKey, window eth (check viem.sh), rpc signer, provider, or signer when constructing Auth",
                "https://docs.fun.xyz/how-to-guides/configure-account"
            )
        }
    }

    async init(): Promise<void> {
        if (this.inited) return
        if (this.client) {
            const address = await this.client.requestAddresses()
            this.account = address[0]
        } else if (this.signer) {
            this.account = this.signer.address
        }
        this.authId ??= this.account
        this.inited = true
    }

    /**
     * Signs a hash using the stored signer and returns the signature.
     * @param {Hex} hash - The hash to be signed.
     * @param {boolean} isGroupOp - Whether the operation is a group operation (default: false).
     * @returns {Promise<Hex>} The signature of the hash.
     */
    async signHash(hash: Hex, isGroupOp = false): Promise<Hex> {
        await this.init()
        let signature
        if (this.signer?.type === "local") {
            signature = await this.signer.signMessage({ message: { raw: toBytes(hash) } })
        } else if (this.client && this.account) {
            signature = await this.client.signMessage({ account: this.account, message: { raw: toBytes(hash) } })
        } else {
            throw new Error("No signer or client")
        }
        if (isGroupOp) {
            return signature
        } else {
            const walletSignature: WalletSignature = {
                userId: await this.getUserId(),
                signature: signature
            }
            return encodeWalletSignature(walletSignature)
        }
    }

    /**
     * Signs an operation using the stored signer and returns the signature.
     * @param {Operation} operation - The operation to be signed.
     * @param {Chain} chain - The chain instance associated with the operation.
     * @param {boolean} isGroupOp - Whether the operation is a group operation (default: false).
     * @returns {Promise<Hex>} The signature of the operation.
     */
    async signOp(operation: Operation, chain: Chain, isGroupOp = false): Promise<Hex> {
        await this.init()
        const opHash = await operation.getOpHash(chain)
        return await this.signHash(opHash, isGroupOp)
    }

    /**
     * Retrieves the address associated with the initialized signer or client.
     * @returns {Promise<Address>} The address associated with the signer or client.
     * @throws {Error} If no signer or client is available.
     */
    async getAddress(): Promise<Address> {
        await this.init()
        if (this.account) return this.account
        throw new Error("No signer or client")
    }

    /**
     * Retrieves the user ID by padding the address associated with the signer or client.
     * @returns {Promise<Hex>} The padded user ID.
     */
    async getUserId(): Promise<Hex> {
        return pad(await this.getAddress(), { size: 32 })
    }

    /**
     * Generates an estimate gas signature for an operation using the provided user ID.
     * @param {string} userId - The user ID to generate the estimate gas signature for.
     * @param {Operation} _ - The operation (not used in this method).
     * @returns {Promise<Hex>} The estimate gas signature.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getEstimateGasSignature(userId: string, _: Operation): Promise<Hex> {
        await this.init()
        const walletSignature: WalletSignature = {
            userId: pad(userId as Hex, { size: 32 }),
            signature: pad("0x", { size: 65 })
        }
        return encodeWalletSignature(walletSignature)
    }

    /**
     * Retrieves a unique ID for the wallet based on an index and optional skipDBActions flag.
     * @param {number} index - The index for generating the unique ID (default: 0).
     * @param {boolean} skipDBActions - Whether to skip database actions (default: false).
     * @returns {Promise<Hex>} The generated unique ID for the wallet.
     */
    async getWalletUniqueId(index = 0, skipDBActions = false): Promise<Hex> {
        await this.init()
        const authUniqueId = await getAuthUniqueId(this.authId!, await this.getAddress(), skipDBActions)
        return keccak256(toBytes(`${authUniqueId}-${index}`))
    }

    /**
     * Sends a transaction with the provided transaction data and options.
     * @param {TransactionParams} txData - The transaction data including 'to', 'data', and 'value'.
     * @param {EnvOption} options - The environment options (default: globalEnvOption).
     * @returns {Promise<TransactionReceipt>} The transaction receipt.
     */
    async sendTx(txData: TransactionParams, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionReceipt> {
        await this.init()
        const chain = await Chain.getChain({ chainIdentifier: options.chain })
        const chainId = await chain.getChainId()
        const { to, data } = txData
        let { value } = txData
        if (!chain || !chainId) {
            throw new InvalidParameterError(
                ErrorCode.MissingParameter,
                "chain object is missing or incorrect",
                "auth.sendTx",
                { options, chainId },
                "Provide proper chain information from options field",
                "https://docs.fun.xyz"
            )
        }
        const client = await chain.getClient()
        let tx
        value ??= 0n
        let txClient
        if (this.client) txClient = this.client
        else {
            txClient = createWalletClient({
                account: this.signer!,
                transport: http(client.transport.url),
                chain: chains[preProcessesChains[await chain.getChainId()]]
            })
        }
        let maxPriorityFee, maxFee

        if ((gasSpecificChain as any)[chainId]) {
            try {
                const {
                    standard: { maxPriorityFee: maxPriorityFee1, maxFee: maxFee1 }
                } = await getGasStation(gasSpecificChain[chainId].gasStationUrl)
                maxPriorityFee = maxPriorityFee1
                maxFee = maxFee1
            } catch (e) {
                maxPriorityFee = BigInt(gasSpecificChain[chainId].backupPriorityFee)
                maxFee = BigInt(gasSpecificChain[chainId].backupFee)
            }

            tx = {
                to,
                value: BigInt(value),
                data,
                maxFeePerGas: BigInt(Math.floor(maxFee * 1e9)),
                maxPriorityFeePerGas: BigInt(Math.floor(maxPriorityFee * 1e9))
            }
        } else {
            tx = { to, value: BigInt(value), data }
        }

        const action = {
            ...tx,
            account: this.signer ?? this.account,
            chain: chains[preProcessesChains[await chain.getChainId()]]
        }
        const hash = await txClient.sendTransaction(action)
        const receipt = await client.waitForTransactionReceipt({ hash, timeout: 300_000 })
        return receipt
    }

    /**
     * Sends an array of transactions and returns an array of corresponding transaction receipts.
     * @param {TransactionData[]} txs - An array of transaction data.
     * @returns {Promise<TransactionReceipt[]>} An array of transaction receipts.
     */
    async sendTxs(txs: TransactionData[]): Promise<TransactionReceipt[]> {
        const receipts: TransactionReceipt[] = []
        for (const tx of txs) {
            receipts.push(await this.sendTx(tx))
        }
        return receipts
    }

    /**
     * Retrieves the user IDs of the current auth object associated with a wallet address on a specific chain.
     * @param {Address} walletAddr - The wallet address for which to retrieve user IDs.
     * @param {string} chainId - The chain identifier.
     * @returns {Promise<Hex[]>} An array of user IDs associated with the wallet address.
     */
    async getUserIds(walletAddr: Address, chainId: string): Promise<Hex[]> {
        await this.init()
        return await getUserWalletIdentities(this.authId!, chainId, walletAddr)
    }

    /**
     * Retrieves the wallets associated with the current auth object.
     * @param {string} [chainId] - Optional chain identifier.
     * @returns {Promise<Wallet[]>} An array of wallet objects associated with the address.
     */
    async getWallets(chainId?: string): Promise<Wallet[]> {
        await this.init()
        try {
            return await getUserWalletsByAddr(await this.getAddress(), chainId)
        } catch (err) {
            if (err instanceof ResourceNotFoundError) {
                return []
            }
            throw err
        }
    }
}
