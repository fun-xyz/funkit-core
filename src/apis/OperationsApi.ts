import { Address } from "viem"
import { Helper, ServerMissingDataError } from "../errors"
import { sendGetRequest } from "../utils/ApiUtils"
export async function getWalletTransactions(walletAddr: Address, chainId: string, status: string): Promise<any> {
    const walletOperations = await sendGetRequest("http://localhost:3000", `operation/wallet/${walletAddr}/${chainId}/${status}`).then(
        (r) => {
            return r
        }
    )
    if (walletOperations?.errorMsg) {
        const helper = new Helper("walletOperations", walletAddr, walletOperations.errorMsg)
        throw new ServerMissingDataError("FunWallet.getOperations", "DataServer", helper)
    }
    if (Array.isArray(walletOperations.operations)) {
        return walletOperations.operations
    }
    const helper = new Helper("walletOperations", walletAddr, "address is not a FunWallet")
    throw new ServerMissingDataError("FunWallet.getOperations", "DataServer", helper)
}
