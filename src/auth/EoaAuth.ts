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
import { privateKeyToAccount, toAccount } from "viem/accounts"
import * as chains from "viem/chains"
import { Auth } from "./Auth"
import { EoaAuthInput } from "./types"
import { ActionFunction } from "../actions"
import { storeEVMCall } from "../apis"
import { TransactionData } from "../common/"
import { EnvOption } from "../config"
import { Chain, UserOp, WalletSignature, encodeWalletSignature, getChainFromData } from "../data"
import { Helper, MissingParameterError } from "../errors"
import { objectify } from "../utils"

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

export class Eoa extends Auth {
    signer?: PrivateKeyAccount | JsonRpcAccount
    client?: WalletClient
    inited = false
    account?: Address
    constructor(authInput: EoaAuthInput) {
        super()
        if (authInput.client) {
            this.client = authInput.client
        }
        if (authInput.privateKey) {
            this.signer = privateKeyToAccount(authInput.privateKey)
        }
        if (authInput.windowEth) {
            this.client = createWalletClient({
                transport: custom(authInput.windowEth)
            })
        }
        if (authInput.rpc) {
            this.client = createWalletClient({
                transport: http(authInput.rpc)
            })
        }
        if (authInput.provider) {
            this.client = createWalletClient({
                transport: custom(authInput.provider)
            })
        }
    }

    async init(): Promise<void> {
        if (this.inited) return
        if (this.client) {
            const address = await this.client.requestAddresses()
            this.account = address[0]
        }
        this.inited = true
    }

    async signHash(hash: Hex): Promise<Hex> {
        await this.init()
        let signature
        if (this.signer?.type === "local") {
            signature = await this.signer.signMessage({ message: { raw: toBytes(hash) } })
        } else if (this.client && this.account) {
            signature = await this.client.signMessage({ account: this.account, message: { raw: toBytes(hash) } })
        } else {
            throw new Error("No signer or client")
        }
        const walletSignature: WalletSignature = {
            userId: await this.getUniqueId(),
            signature: signature
        }
        return encodeWalletSignature(walletSignature)
    }

    async signOp(userOp: UserOp, chain: Chain): Promise<string> {
        await this.init()
        const opHash = await userOp.getOpHashData(chain)
        return await this.signHash(opHash)
    }

    async getUniqueId(): Promise<Hex> {
        await this.init()
        if (this.signer) return this.signer!.address
        if (this.client && this.account) return this.account
        throw new Error("No signer or client")
    }

    async getOwnerAddr(): Promise<Hex[]> {
        await this.init()
        return [await this.getUniqueId()]
    }

    async getEstimateGasSignature(): Promise<string> {
        await this.init()
        const walletSignature: WalletSignature = {
            userId: await this.getUniqueId(),
            signature: pad("0x", { size: 65 })
        }
        return encodeWalletSignature(walletSignature)
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
            account: this.account ? toAccount(this.account) : undefined,
            ...tx,
            chain: chains[preProcessesChains[await chain.getChainId()]]
        }

        const hash = await txClient.sendTransaction(action)

        const receipt = await client.waitForTransactionReceipt({ hash })
        await storeEVMCall(receipt)
        return receipt
    }

    async getAddress(): Promise<Address> {
        await this.init()
        return await this.getUniqueId()
    }
}
