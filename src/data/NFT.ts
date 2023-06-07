import { Address, isAddress } from "viem"
import { getChainFromData } from "./Chain"
import { TransactionData, erc721ContractInterface } from "../common"
import { EnvOption } from "../config"
import { MissingParameterError } from "../errors"

export class NFT {
    address: Address

    constructor(address: string, location = "NFT constructor") {
        if (isAddress(address)) {
            this.address = address
            return
        }
        throw new MissingParameterError(location)
    }

    async approve(spender: string, tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const data = await erc721ContractInterface.encodeTransactionData(await this.getAddress(), "approve", [spender, tokenId])
        return { ...data, chain }
    }

    async approveForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const data = await erc721ContractInterface.encodeTransactionData(await this.getAddress(), "setApprovalForAll", [spender, true])
        return { ...data, chain }
    }

    async getAddress(): Promise<Address> {
        return this.address
    }
    async getBalance(address: Address, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const chain = await getChainFromData(options.chain)
        return await erc721ContractInterface.readFromChain(await this.getAddress(), "balanceOf", [address], chain)
    }

    async getApproved(tokenId: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const chain = await getChainFromData(options.chain)
        return await erc721ContractInterface.readFromChain(await this.getAddress(), "getApproved", [tokenId], chain)
    }

    async revokeForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const data = await erc721ContractInterface.encodeTransactionData(await this.getAddress(), "setApprovalForAll", [spender, false])
        return { ...data, chain }
    }

    async transfer(
        sender: string,
        spender: string,
        tokenId: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const data = await erc721ContractInterface.encodeTransactionData(await this.getAddress(), "transferFrom", [
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
}
