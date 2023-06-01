import { BigNumber, Contract, Signer } from "ethers"
import { EnvOption } from "src/config/config"
import { Chain, getChainFromData, UserOp } from "../data"
import { BytesLike } from "ethers/lib/utils"
import { TransactionReceipt } from "@ethersproject/providers"
import { TransactionData } from "../common/types/TransactionData"
import { ENTRYPOINT_ABI } from "../common/constants"
const entrypointAbi = ENTRYPOINT_ABI.abi

export abstract class Auth {
    abstract signHash(hash: BytesLike): Promise<string>
    abstract signOp(userOp: UserOp, chain: Chain): Promise<string>
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
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const provider = await chain.getProvider()
        const entrypointContract = new Contract(entryPointAddress, entrypointAbi, provider)
        return await entrypointContract.getNonce(sender, key)
    }
}
