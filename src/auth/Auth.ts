import { BigNumber, Contract, Signer } from "ethers"
import { EnvOption } from "src/config/config"
import { getChainFromData } from "../data"
import { BytesLike } from "ethers/lib/utils"
import { TransactionReceipt } from "@ethersproject/providers"
import { TransactionData } from "src/common/types/TransactionData"
const entrypointAbi = require("../abis/EntryPoint.json").abi

export abstract class Auth {
    abstract signHash(hash: BytesLike): Promise<string>
    abstract getUniqueId(): Promise<string>
    abstract getSigner(): Promise<Signer>
    abstract getOwnerAddr(): Promise<string[]>
    abstract getEstimateGasSignature(): Promise<string>
    abstract sendTx(txData: TransactionData | Function): Promise<TransactionReceipt>

    async sendTxs(txs: TransactionData[] | Function[]): Promise<TransactionReceipt[]> {
        const receipts = []
        for (let tx of txs) {
            receipts.push(await this.sendTx(tx))
        }
        return receipts
    }

    async getNonce(sender: string, key = 0, option: EnvOption = globalEnvOption): Promise<BigNumber> {
        const chain = await getChainFromData(option.chain)
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const provider = await chain.getProvider()
        const entrypointContract = new Contract(entryPointAddress, entrypointAbi, provider)
        return await entrypointContract.getNonce(sender, key)
    }
}
