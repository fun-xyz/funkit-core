import { TransactionReceipt, Web3Provider } from "@ethersproject/providers"
import { Signer, Wallet } from "ethers"
import { BytesLike, arrayify, hexZeroPad, toUtf8Bytes } from "ethers/lib/utils"
import { Auth } from "./Auth"
import { EoaAuthInput } from "./types"
import { storeEVMCall } from "../apis"
import { TransactionData } from "../common/"
import { EnvOption } from "../config"
import { Chain, UserOp, WalletSignature, encodeWalletSignature } from "../data"
import { Helper, MissingParameterError } from "../errors"
import { verifyPrivateKey } from "../utils/DataUtils"

const gasSpecificChain = { "137": 850_000_000_000 }

export class Eoa extends Auth {
    signer?: Signer
    privateKey?: string
    provider?: Web3Provider

    constructor(authInput: EoaAuthInput) {
        super()
        if (authInput.privateKey) {
            verifyPrivateKey(authInput.privateKey, "EoaAuth constructor")
            this.privateKey = authInput.privateKey
        } else if (authInput.signer) {
            this.signer = authInput.signer
        } else if (authInput.provider) {
            this.provider = authInput.provider
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
        const walletSignature: WalletSignature = {
            signature: await await this.signer!.signMessage(arrayify(hash)),
            userId: await this.getUniqueId()
        }
        return encodeWalletSignature(walletSignature)
    }

    async signOp(userOp: UserOp, chain: Chain): Promise<string> {
        await this.init()
        const opHash = await userOp.getOpHashData(chain)
        return await this.signHash(opHash)
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
        const walletSignature: WalletSignature = {
            userId: await this.getUniqueId(),
            signature: hexZeroPad(toUtf8Bytes(""), 65)
        }
        return encodeWalletSignature(walletSignature)
    }

    async sendTx(
        txData: TransactionData | Function,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionReceipt> {
        await this.init()
        if (typeof txData === "function") {
            txData = await txData(options)
        }
        const { to, value, data, chain } = txData as TransactionData
        if (!chain || !chain.id) {
            const currentLocation = "Eoa.sendTx"
            const helperMainMessage = "Chain object is missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, txData, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        const provider = await chain.getProvider()
        let eoa = this.signer!
        if (!eoa.provider) {
            eoa = this.signer!.connect(provider!)
        }
        let tx
        if ((gasSpecificChain as any)[chain!.id!]) {
            tx = await eoa.sendTransaction({ to, value, data, gasPrice: (gasSpecificChain as any)[chain.id] })
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
