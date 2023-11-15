import { Address, isAddress } from "viem"
import { Chain } from "./Chain"
import { getNftAddress, getNftName } from "../apis/NFTApis"
import { ERC721_CONTRACT_INTERFACE, TransactionData } from "../common"
import { GlobalEnvOption } from "../config"
import { ErrorCode, InvalidParameterError } from "../errors"

export class NFT {
    address?: Address
    name = ""
    options: GlobalEnvOption

    constructor(input: string, options: GlobalEnvOption) {
        if (!input) {
            throw new InvalidParameterError(
                ErrorCode.InvalidNFTIdentifier,
                "valid NFT identifier is required, could be address or name",
                { input },
                "Please provide valid NFT identifier",
                "https://docs.fun.xyz"
            )
        }

        if (isAddress(input)) {
            this.address = input
        } else {
            this.name = input
        }
        this.options = options
    }

    async approve(spender: string, tokenId: number, options: GlobalEnvOption = this.options): Promise<TransactionData> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "approve", [spender, tokenId])
        return { ...data, chain }
    }

    async ownerOf(tokenId: number, options: GlobalEnvOption = this.options): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "ownerOf", [tokenId], chain)
    }

    async approveForAll(spender: string, options: GlobalEnvOption = this.options): Promise<any> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "setApprovalForAll", [spender, true])
        return { ...data, chain }
    }

    async getAddress(): Promise<Address> {
        if (!this.address) {
            if (!this.name) {
                throw new InvalidParameterError(
                    ErrorCode.InvalidNFTIdentifier,
                    "valid NFT identifier is required, could be address or name",
                    {},
                    "Please provide valid NFT identifier",
                    "https://docs.fun.xyz"
                )
            }
            const nft = await getNftAddress(this.name, this.options.apiKey)
            return nft.address
        } else {
            return this.address
        }
    }

    async getName(options: GlobalEnvOption = this.options): Promise<string> {
        if (!this.name && this.address) {
            const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
            const nft = await getNftName(chain.getChainId(), this.address, options.apiKey)
            return nft.name
        }
        return this.name
    }

    async getBalance(address: Address, options: GlobalEnvOption = this.options): Promise<bigint> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
    }

    async getApproved(tokenId: string, options: GlobalEnvOption = this.options): Promise<Address> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "getApproved", [tokenId], chain)
    }

    async revokeForAll(spender: string, options: GlobalEnvOption = this.options): Promise<TransactionData> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "setApprovalForAll", [spender, false])
        return { ...data, chain }
    }

    async transfer(sender: string, spender: string, tokenId: number, options: GlobalEnvOption = this.options): Promise<any> {
        const chain = await Chain.getChain({ chainIdentifier: options.chain }, options.apiKey)
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "transferFrom", [sender, spender, tokenId])
        return { ...data, chain }
    }

    static async approve(data: string, spender: string, tokenId: number, options: GlobalEnvOption): Promise<TransactionData> {
        const nft = new NFT(data, options)
        return await nft.approve(spender, tokenId, options)
    }

    static async approveForAll(data: string, spender: string, options: GlobalEnvOption): Promise<TransactionData> {
        const nft = new NFT(data, options)
        return await nft.approveForAll(spender, options)
    }

    static async getAddress(data: string, options: GlobalEnvOption): Promise<string> {
        const nft = new NFT(data, options)
        return await nft.getAddress()
    }

    static async getApproved(data: string, tokenId: string, options: GlobalEnvOption): Promise<string> {
        const nft = new NFT(data, options)
        return await nft.getApproved(tokenId, options)
    }

    static async revokeForAll(data: string, spender: string, options: GlobalEnvOption): Promise<TransactionData> {
        const nft = new NFT(data, options)
        return await nft.revokeForAll(spender, options)
    }

    static async transfer(
        data: string,
        sender: string,
        spender: string,
        tokenId: number,
        options: GlobalEnvOption
    ): Promise<TransactionData> {
        const nft = new NFT(data, options)
        return await nft.transfer(sender, spender, tokenId, options)
    }

    static async ownerOf(data: string, tokenId: number, options: GlobalEnvOption): Promise<Address> {
        const nft = new NFT(data, options)
        return await nft.ownerOf(tokenId, options)
    }
}
