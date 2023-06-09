import {
    Hex,
    JsonRpcAccount,
    PrivateKeyAccount,
    TransactionReceipt,
    WalletClient,
    createWalletClient,
    http,
    pad,
    parseUnits,
    toBytes
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import * as chains from "viem/chains"
import { Auth } from "./Auth"
import { EoaAuthInput } from "./types"
import { storeEVMCall } from "../apis"
import { TransactionData } from "../common/"
import { EnvOption } from "../config"
import { Chain, UserOp, WalletSignature, encodeWalletSignature } from "../data"
import { Helper, MissingParameterError } from "../errors"

const gasSpecificChain = { "137": 850_000_000_000 }

const preProcessesChains: any = {}
for (const key in chains) {
    const chain = chains[key]
    preProcessesChains[chain.id] = key
}

export class Eoa extends Auth {
    signer?: PrivateKeyAccount | JsonRpcAccount
    client?: WalletClient
    constructor(authInput: EoaAuthInput) {
        super()
        if (authInput.privateKey) {
            this.signer = privateKeyToAccount(authInput.privateKey)
        }
        if (authInput.client) {
            this.client = authInput.client
        }
    }

    async signHash(hash: Hex): Promise<Hex> {
        let signature
        if (this.signer?.type === "local") {
            signature = await this.signer.signMessage({ message: { raw: toBytes(hash) } })
        } else if (this.client && this.signer?.type === "json-rpc") {
            signature = await this.client.signMessage({ account: this.signer, message: hash })
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
        const opHash = await userOp.getOpHashData(chain)
        return await this.signHash(opHash)
    }

    async getUniqueId(): Promise<Hex> {
        return this.signer!.address
    }

    async getOwnerAddr(): Promise<Hex[]> {
        return [await this.getUniqueId()]
    }

    async getEstimateGasSignature(): Promise<string> {
        const walletSignature: WalletSignature = {
            userId: await this.getUniqueId(),
            signature: pad("0x", { size: 65 })
        }
        return encodeWalletSignature(walletSignature)
    }

    async sendTx(
        txData: TransactionData | Function,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionReceipt> {
        if (typeof txData === "function") {
            txData = (await txData(options)).data
        }
        const { to, data, chain } = txData as TransactionData
        let { value } = txData as TransactionData
        if (!chain || !chain.id) {
            const currentLocation = "Eoa.sendTx"
            const helperMainMessage = "Chain object is missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, txData, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        const client = await chain.getClient()
        let tx
        value ??= 0n
        const txClient = createWalletClient({ account: this.signer!, transport: http(client.transport.url) })
        if ((gasSpecificChain as any)[chain!.id!]) {
            tx = {
                to,
                value: BigInt(value),
                data,
                maxFeePerGas: BigInt(gasSpecificChain[chain!.id!])
            }
        } else {
            tx = { to, value: BigInt(value), data, maxFeePerGas: parseUnits("2", 9) }
        }
        const hash = await txClient.sendTransaction({
            ...tx,
            chain: chains[preProcessesChains[await chain.getChainId()]]
        })

        const receipt = await client.waitForTransactionReceipt({ hash })
        await storeEVMCall(receipt)
        return receipt
    }
}
