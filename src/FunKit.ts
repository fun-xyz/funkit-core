import { Address, Hex } from "viem"
import { SwapAction, TokenAction } from "./actions"
import { AccessControlAction } from "./actions/AccessControlAction"
import { BridgeAction } from "./actions/BridgeAction"
import { GroupAction } from "./actions/GroupAction"
import { getOps } from "./apis/OperationApis"
import { Auth } from "./auth"
import { AuthInput } from "./auth/types"
import { GlobalEnvOption } from "./config"
import { Chain, NFT, Token } from "./data"
import { GaslessSponsor, TokenSponsor } from "./sponsors"
import { FunWallet } from "./wallet"

export class FunKit {
    private options: GlobalEnvOption
    private initedChains = new Map<string, Chain>()

    constructor(options: GlobalEnvOption) {
        if (!options.apiKey) {
            throw new Error("API Key is required")
        }
        this.options = options
    }

    async getChain(chainNameOrId?: string | Chain | number): Promise<Chain> {
        if (!chainNameOrId) {
            if (this.options.chain) {
                chainNameOrId = this.options.chain
            } else {
                throw new Error("chainId must be provided or set in the configuration options.")
            }
        }

        if (chainNameOrId instanceof Chain) {
            return chainNameOrId
        }
        let chainIdStr: string
        let chain: Chain

        if (typeof chainNameOrId === "number" || !isNaN(Number(chainNameOrId))) {
            chainIdStr = chainNameOrId.toString()
            if (!this.initedChains.has(chainIdStr)) {
                chain = await Chain.getChain({ chainIdentifier: chainIdStr }, this.options.apiKey)
                this.initedChains.set(chainIdStr, chain)
            }
        } else {
            if (!this.initedChains.has(chainNameOrId)) {
                chain = await Chain.getChain({ chainIdentifier: chainNameOrId }, this.options.apiKey)
                const chainId = chain.getChainId()
                this.initedChains.set(chainNameOrId, chain)
                this.initedChains.set(chainId, chain)
            }
            chainIdStr = chainNameOrId
        }

        return this.initedChains.get(chainIdStr)!
    }

    getAuth(authInput: AuthInput): Auth {
        return new Auth(authInput, this.options.apiKey)
    }

    async createWalletWithAuth(auth: Auth, index?: number, chainId?: number): Promise<FunWallet> {
        console.log("Creating wallet from auth")
        const userId = await auth.getAddress()
        const uniqueId = await auth.getWalletUniqueId(index)
        const wallet = new FunWallet(
            {
                users: [{ userId }],
                uniqueId
            },
            this.options,
            await this.getChain(chainId)
        )
        await wallet.getAddress()
        return wallet
    }

    async createWalletWithUsersAndId(users: any[], uniqueId: string, chainId?: number): Promise<FunWallet> {
        if (!users || !uniqueId) {
            throw new Error("Users list and uniqueId must be provided.")
        }

        const wallet = new FunWallet(
            {
                users,
                uniqueId
            },
            this.options,
            await this.getChain(chainId)
        )
        await wallet.getAddress()
        return wallet
    }

    async getWallet(address: string, chainId?: number): Promise<FunWallet> {
        const wallet = new FunWallet(address, this.options, await this.getChain(chainId))
        wallet.getAddress()
        return wallet
    }

    getNFT(input: string): NFT {
        return new NFT(input, this.options)
    }

    /**
     * Get token balance of a wallet without create a fun wallet
     **/
    async getTokenBalance(tokenAddress: string, walletAddress: Address, chain?: Chain): Promise<string> {
        return await Token.getBalance(tokenAddress, walletAddress, await this.getChain(chain), this.options.apiKey)
    }

    async getOps(opIds: Hex[], chainId?: string): Promise<any> {
        return await getOps(opIds, (await this.getChain(chainId)).getChainId(), this.options.apiKey)
    }

    async getTokenAction(chainId?: number): Promise<TokenAction> {
        if (chainId) {
            return new TokenAction({ ...this.options, chain: chainId })
        }
        return new TokenAction(this.options)
    }

    async getSwapAction(chainId?: number): Promise<SwapAction> {
        if (chainId) {
            return new SwapAction({ ...this.options, chain: chainId })
        }
        return new SwapAction(this.options)
    }

    async getAccessControlAction(chainId?: number): Promise<AccessControlAction> {
        if (chainId) {
            return new AccessControlAction({ ...this.options, chain: chainId })
        }
        return new AccessControlAction(this.options)
    }

    async getGroupAction(chainId?: number): Promise<GroupAction> {
        if (chainId) {
            return new GroupAction({ ...this.options, chain: chainId })
        }
        return new GroupAction(this.options)
    }

    async getBridgeAction(chainId?: number): Promise<BridgeAction> {
        if (chainId) {
            return new BridgeAction({ ...this.options, chain: chainId })
        }
        return new BridgeAction(this.options)
    }

    setGaslessSponsor(sponsorAddress: Address, chainId?: number): GaslessSponsor {
        this.options = {
            ...this.options,
            chain: chainId ? chainId : this.options.chain,
            gasSponsor: {
                sponsorAddress: sponsorAddress
            }
        }
        return new GaslessSponsor(this.options)
    }

    setTokenSponsor(tokenSponsorParams: any, chainId?: number): TokenSponsor {
        this.options = {
            ...this.options,
            chain: chainId ? chainId : this.options.chain,
            gasSponsor: tokenSponsorParams
        }
        return new TokenSponsor(this.options)
    }
}
