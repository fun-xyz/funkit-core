import { TransactionReceipt } from "@ethersproject/providers"
import { BigNumber, Contract, Signer } from "ethers"
import { BytesLike } from "ethers/lib/utils"
import entryPointContract from "../abis/EntryPoint.json"
import { TransactionData } from "../common/types/TransactionData"
import { EnvOption } from "../config/Config"
import { getChainFromData } from "../data"

export abstract class Auth {
    abstract signHash(hash: BytesLike): Promise<string>
    abstract getUniqueId(): Promise<string>
    abstract getSigner(): Promise<Signer>
    abstract getOwnerAddr(): Promise<string[]>
    abstract getEstimateGasSignature(): Promise<string>
    abstract sendTx(txData: TransactionData | Function): Promise<TransactionReceipt>

    async sendTxs(txs: TransactionData[] | Function[]): Promise<TransactionReceipt[]> {
        const receipts: TransactionReceipt[] = []
        for (const tx of txs) {
            receipts.push(await this.sendTx(tx))
        }
        return receipts
    }

    async getNonce(sender: string, key = 0, option: EnvOption = (globalThis as any).globalEnvOption): Promise<BigNumber> {
        const chain = await getChainFromData(option.chain)
        const entryPointAddress = await chain.getAddress("EntryPoint")
        const provider = await chain.getProvider()
        const entrypointContract = new Contract(entryPointAddress, entryPointContract.abi, provider)
        return await entrypointContract.getNonce(sender, key)
    }
}
