import { Hex, TransactionReceipt } from "viem"
import { TransactionData, entrypointContractInterface } from "../common"
import { EnvOption } from "../config"
import { Chain, UserOp, getChainFromData } from "../data"
export abstract class Auth {
    abstract signHash(hash: Hex): Promise<Hex>
    abstract signOp(userOp: UserOp, chain: Chain): Promise<string>
    abstract getUniqueId(): Promise<string>
    abstract getOwnerAddr(): Promise<Hex[]>
    abstract getEstimateGasSignature(): Promise<string>
    abstract sendTx(txData: TransactionData | Function): Promise<TransactionReceipt>

    async sendTxs(txs: TransactionData[] | Function[]): Promise<TransactionReceipt[]> {
        const receipts: TransactionReceipt[] = []
        for (const tx of txs) {
            receipts.push(await this.sendTx(tx))
        }
        return receipts
    }

    async getNonce(sender: string, key = 0, option: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(option.chain)
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        return BigInt(await entrypointContractInterface.readFromChain(entryPointAddress, "getNonce", [sender, key], chain))
    }
}
