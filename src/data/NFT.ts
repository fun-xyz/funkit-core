import { Address, isAddress } from "viem"
import { Chain } from "./Chain"
import { getNftAddress, getNftName } from "../apis/NFTApis"
import { ERC721_CONTRACT_INTERFACE, TransactionData } from "../common"
import { EnvOption } from "../config"
import { ErrorCode, InvalidParameterError } from "../errors"

export class NFT {
    address?: Address
    name = ""

    constructor(input: string) {
        if (!input) {
            throw new InvalidParameterError(
                ErrorCode.InvalidNFTIdentifier,
                "valid NFT identifier is required, could be address or name",
                "NFT.constructor",
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
    }

    async approve(spender: string, tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionData> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "approve", [spender, tokenId])
        return { ...data, chain }
    }

    async ownerOf(tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "ownerOf", [tokenId], chain)
    }

    async approveForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "setApprovalForAll", [spender, true])
        return { ...data, chain }
    }

    async getAddress(): Promise<Address> {
        if (!this.address) {
            if (!this.name) {
                throw new InvalidParameterError(
                    ErrorCode.InvalidNFTIdentifier,
                    "valid NFT identifier is required, could be address or name",
                    "NFT.getAddress",
                    {},
                    "Please provide valid NFT identifier",
                    "https://docs.fun.xyz"
                )
            }
            const nft = await getNftAddress(this.name)
            return nft.address
        } else {
            return this.address
        }
    }

    async getName(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        if (!this.name && this.address) {
            const chain = Chain.getChain({ chainIdentifier: options.chain })
            const nft = await getNftName(await chain.getChainId(), this.address)
            return nft.name
        }
        return this.name
    }

    async getBalance(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
    }

    async getApproved(tokenId: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "getApproved", [tokenId], chain)
    }

    async revokeForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionData> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "setApprovalForAll", [spender, false])
        return { ...data, chain }
    }

    async transfer(
        sender: string,
        spender: string,
        tokenId: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const chain = Chain.getChain({ chainIdentifier: options.chain })
        const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(await this.getAddress(), "transferFrom", [sender, spender, tokenId])
        return { ...data, chain }
    }

    static async approve(
        data: string,
        spender: string,
        tokenId: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.approve(spender, tokenId, options)
    }

    static async approveForAll(
        data: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.approveForAll(spender, options)
    }

    static async getAddress(data: string): Promise<string> {
        const nft = new NFT(data)
        return await nft.getAddress()
    }

    static async getApproved(data: string, tokenId: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const nft = new NFT(data)
        return await nft.getApproved(tokenId, options)
    }

    static async revokeForAll(
        data: string,
        spender: string,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.revokeForAll(spender, options)
    }

    static async transfer(
        data: string,
        sender: string,
        spender: string,
        tokenId: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.transfer(sender, spender, tokenId, options)
    }

    static async ownerOf(data: string, tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const nft = new NFT(data)
        return await nft.ownerOf(tokenId, options)
    }
}
