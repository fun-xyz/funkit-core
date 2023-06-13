import { Address, isAddress } from "viem"
import { getChainFromData } from "./Chain"
import { getNftAddress, getNftName } from "../apis/NFTApis"
import { ERC721_CONTRACT_INTERFACE, TransactionData } from "../common"
import { EnvOption } from "../config"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"

export class NFT {
    address?: Address
    name = ""

    constructor(input: string, location = "NFT") {
        if (isAddress(input)) {
            this.address = input
            return
        } else if (input) {
            this.name = input
        } else {
            throw new MissingParameterError(location)
        }
        this.name = input
    }

    async approve(spender: string, tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const data = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(await this.getAddress(), "approve", [spender, tokenId])
        return { ...data, chain }
    }

    async ownerOf(tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await getChainFromData(options.chain)
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "ownerOf", [tokenId], chain)
    }

    async approveForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const data = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(await this.getAddress(), "setApprovalForAll", [spender, true])
        return { ...data, chain }
    }

    async getAddress(): Promise<Address> {
        if (!this.address) {
            if (!this.name) throw new MissingParameterError("NFT.getAddress")
            const nft = await getNftAddress(this.name)
            if (nft.error) {
                const helper = new Helper("getName", "", "call failed")
                helper.pushMessage(`NFT address for ${this.name} not found`)
                throw new ServerMissingDataError("NFT.getAddress", "NFT", helper)
            } else {
                return nft.address
            }
        } else {
            return this.address
        }
    }

    async getName(options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        if (!this.name && this.address) {
            const chain = await getChainFromData(options.chain)
            const nft = await getNftName(await chain.getChainId(), this.address)
            if (nft.error) {
                const helper = new Helper("getName", chain, "call failed")
                helper.pushMessage(`NFT name for address ${this.address} and chain id ${await chain.getChainId()} not found`)
                throw new ServerMissingDataError("NFT.getName", "NFT", helper)
            } else {
                return nft.name
            }
        }
        return this.name
    }

    async getBalance(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<bigint> {
        const chain = await getChainFromData(options.chain)
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
    }

    async getApproved(tokenId: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<Address> {
        const chain = await getChainFromData(options.chain)
        return await ERC721_CONTRACT_INTERFACE.readFromChain(await this.getAddress(), "getApproved", [tokenId], chain)
    }

    async revokeForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const data = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(await this.getAddress(), "setApprovalForAll", [spender, false])
        return { ...data, chain }
    }

    async transfer(
        sender: string,
        spender: string,
        tokenId: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const data = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(await this.getAddress(), "transferFrom", [
            sender,
            spender,
            tokenId
        ])
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
