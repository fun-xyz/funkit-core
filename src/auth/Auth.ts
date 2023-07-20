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
    pad,
    toBytes
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import * as chains from "viem/chains"
import { ActionFunction } from "../actions"
import { Wallet } from "../apis/types"
import { getUserWalletIdentities, getUserWalletsByAddr } from "../apis/UserApis"
import { TransactionData } from "../common"
import { EnvOption } from "../config"
import { Chain, Operation, WalletSignature, encodeWalletSignature, getChainFromData } from "../data"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"
import { getAuthUniqueId, objectify } from "../utils"

const gasSpecificChain = { "137": 850_000_000_000 }

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
    privateKey?: Hex
    windowEth?: any
    rpc?: string
    provider?: any
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
            this.client = createWalletClient({
                transport: custom(authInput.provider)
            })
        }

        if (authInput.privateKey) {
            this.signer = privateKeyToAccount(authInput.privateKey)
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

    async signOp(operation: Operation, chain: Chain, isGroupOp = false): Promise<Hex> {
        await this.init()
        const opHash = await operation.getOpHash(chain)
        return await this.signHash(opHash, isGroupOp)
    }

    async getAddress(): Promise<Address> {
        await this.init()
        if (this.account) return this.account
        throw new Error("No signer or client")
    }

    async getUserId(): Promise<Hex> {
        return pad(await this.getAddress(), { size: 32 })
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getEstimateGasSignature(userId: string, _: Operation): Promise<Hex> {
        await this.init()
        const walletSignature: WalletSignature = {
            userId: pad(userId as Hex, { size: 32 }),
            signature: pad("0x", { size: 65 })
        }
        return encodeWalletSignature(walletSignature)
    }

    async getWalletUniqueId(chainId: string, index = 0, skipDBActions = false): Promise<string> {
        await this.init()
        const authUniqueId = getAuthUniqueId(this.authId!, chainId, await this.getAddress(), skipDBActions)
        return `${authUniqueId}-${index}`
    }

    async sendTx(
        txData: TransactionData | ActionFunction,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionReceipt> {
        await this.init()
        if (typeof txData === "function") {
            const chain = await getChainFromData(options.chain)
            txData = (await txData({ wallet: this, chain, options })).data
        }
        const { to, data, chain } = txData as TransactionData
        let { value } = txData as TransactionData
        if (!chain || !chain.id) {
            const currentLocation = "Eoa.sendTx"
            const helperMainMessage = "Chain object is missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, objectify(txData), helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
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

        if ((gasSpecificChain as any)[chain!.id!]) {
            tx = {
                to,
                value: BigInt(value),
                data,
                maxFeePerGas: BigInt(gasSpecificChain[chain!.id!])
            }
        } else {
            tx = { to, value: BigInt(value), data }
        }

        const action = {
            ...tx,
            chain: chains[preProcessesChains[await chain.getChainId()]]
        }

        const hash = await txClient.sendTransaction(action)
        const receipt = await client.waitForTransactionReceipt({ hash, timeout: 300_000 })
        return receipt
    }

    async sendTxs(txs: TransactionData[] | ActionFunction[]): Promise<TransactionReceipt[]> {
        const receipts: TransactionReceipt[] = []
        for (const tx of txs) {
            receipts.push(await this.sendTx(tx))
        }
        return receipts
    }

    async getUserIds(walletAddr: Address, chainId: string): Promise<Hex[]> {
        await this.init()
        return await getUserWalletIdentities(this.authId!, chainId, walletAddr)
    }

    async getWallets(chainId: string): Promise<Wallet[]> {
        await this.init()
        try {
            return await getUserWalletsByAddr(await this.getAddress(), chainId)
        } catch (err) {
            if (err instanceof ServerMissingDataError) {
                return []
            }
            throw err
        }
    }
}
