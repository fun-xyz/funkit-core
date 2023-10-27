import { Auth } from "./auth"
import { GlobalEnvOption } from "./config"
import { Chain } from "./data"
import { FunWallet } from "./wallet"

export class FunKit {
    private options: GlobalEnvOption

    constructor(options: GlobalEnvOption) {
        if (!options.apiKey) {
            throw new Error("API Key is required")
        }
        this.options = options
    }

    async createWalletFromAuth(auth: Auth, index: number, chainId: number): Promise<FunWallet> {
        console.log("Creating wallet from auth")
        const userId = await auth.getAddress()
        const uniqueId = await auth.getWalletUniqueId(index, this.options.apiKey)
        console.log("Unique id", uniqueId)
        const chain = await Chain.getChain({ chainIdentifier: chainId })
        return new FunWallet(
            {
                users: [{ userId: userId }],
                uniqueId: uniqueId
            },
            this.options,
            chain
        )
    }

    async getWalletFromAddress(address: string, chainId: number): Promise<FunWallet> {
        console.log("Getting wallet from address")
        const chain = await Chain.getChain({ chainIdentifier: chainId })
        return new FunWallet(address, this.options, chain)
    }
}
