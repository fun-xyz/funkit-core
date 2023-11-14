import { isAddress } from "viem"
import { Action } from "./Action"
import {
    erc20ApproveTransactionParams,
    erc721ApproveTransactionParams,
    erc721TransferTransactionParams,
    tokenTransferFromTransactionParams,
    tokenTransferTransactionParams
} from "./Token"
import { ApproveERC20Params, ApproveERC721Params, ERC721TransferParams, TokenTransferParams, TransactionParams } from "./types" // Assuming you have these types defined
import { GlobalEnvOption } from "../config"
import { Chain, NFT, Token } from "../data"

export class TokenAction extends Action {
    constructor(txOptions: GlobalEnvOption) {
        super(txOptions)
    }

    async tokenTransferTransactionParams(params: TokenTransferParams): Promise<TransactionParams> {
        if (!(params.token instanceof Token)) {
            const chain: Chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
            params.token = new Token(params.token, chain, "0x", this.txOptions.apiKey)
        }
        return await tokenTransferTransactionParams(params)
    }

    async tokenTransferFromTransactionParams(params: TokenTransferParams): Promise<TransactionParams> {
        if (!(params.token instanceof Token)) {
            const chain: Chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
            params.token = new Token(params.token, chain, "0x", this.txOptions.apiKey)
        }
        return await tokenTransferFromTransactionParams(params)
    }

    async erc20ApproveTransactionParams(params: ApproveERC20Params): Promise<TransactionParams> {
        if (!(params.token instanceof Token)) {
            const chain: Chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
            params.token = new Token(params.token, chain, "0x", this.txOptions.apiKey)
        }
        return await erc20ApproveTransactionParams(params)
    }

    async erc721TransferTransactionParams(params: ERC721TransferParams): Promise<TransactionParams> {
        if (!isAddress(params.collection)) {
            params.collection = await NFT.getAddress(params.collection, this.txOptions)
        }
        return await erc721TransferTransactionParams(params)
    }

    async erc721ApproveTransactionParams(params: ApproveERC721Params): Promise<TransactionParams> {
        if (!isAddress(params.collection)) {
            params.collection = await NFT.getAddress(params.collection, this.txOptions)
        }
        return await erc721ApproveTransactionParams(params)
    }
}
