import { Signer, Wallet } from "ethers"
import { BytesLike, arrayify } from "ethers/lib/utils"
import { verifyPrivateKey } from "../utils/DataUtils"
import { TransactionReceipt, Web3Provider } from "@ethersproject/providers"
import { TransactionData } from "src/common/types/TransactionData"
import { storeEVMCall } from "../apis"
import { Auth } from "./Auth"
import { EnvOption } from "src/config"

const gasSpecificChain = { "137": 850_000_000_000 }

export interface EoaAuthInput {
    signer?: Signer
    privateKey?: string
    provider?: Web3Provider
}

export class Eoa extends Auth {
    signer?: Signer
    privateKey?: string
    provider?: Web3Provider

    constructor(eoaAuthInput: EoaAuthInput) {
        super()
        if (eoaAuthInput.privateKey) {
            verifyPrivateKey(eoaAuthInput.privateKey, "EoaAuth constructor")
            this.privateKey = eoaAuthInput.privateKey
        } else if (eoaAuthInput.signer) {
            this.signer = eoaAuthInput.signer
        } else if (eoaAuthInput.provider) {
            this.provider = eoaAuthInput.provider
        }
    }

    async init() {
        if (this.signer) {
            return
        } else if (this.privateKey) {
            this.signer = new Wallet(this.privateKey)
        } else if (this.provider) {
            this.signer = await this.getSignerFromProvider(this.provider)
        }
    }

    async signHash(hash: BytesLike): Promise<string> {
        await this.init()
        return await this.signer!.signMessage(arrayify(hash))
    }

    async getUniqueId(): Promise<string> {
        await this.init()
        return await this.signer!.getAddress()
    }

    async getSigner(): Promise<Signer> {
        await this.init()
        return this.signer!
    }

    async getOwnerAddr(): Promise<string[]> {
        return [await this.getUniqueId()]
    }

    async getEstimateGasSignature(): Promise<string> {
        return await this.getUniqueId()
    }

    async sendTx(txData: TransactionData | Function, options: EnvOption = globalEnvOption): Promise<TransactionReceipt> {
        await this.init()
        if (typeof txData === "function") {
            txData = await txData(options)
        }
        const { to, value, data, chain } = txData as TransactionData
        const provider = await chain.getProvider()
        let eoa = this.signer!
        if (!eoa.provider) {
            eoa = this.signer!.connect(provider!)
        }
        let tx
        if ((gasSpecificChain as any)[chain.id!]) {
            tx = await eoa.sendTransaction({ to, value, data, gasPrice: (gasSpecificChain as any)[chain.id!] })
        } else {
            tx = await eoa.sendTransaction({ to, value, data })
        }
        const receipt = await tx.wait()
        await storeEVMCall(receipt)
        return receipt
    }

    async getSignerFromProvider(provider: Web3Provider): Promise<Signer> {
        await provider.send("eth_requestAccounts", [])
        return provider.getSigner()
    }
}