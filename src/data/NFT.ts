import { Contract, ethers } from "ethers"
import { MissingParameterError } from "../errors"
import erc721_abi from "../abis/ERC721.json"
import { getChainFromData } from "./Chain"
import { EnvOption } from "src/config/config"
import { Chain } from "./Chain"

type TransactionData = {
    data: ethers.PopulatedTransaction
    chain: Chain
}
export class NFT {
    address = ""
    contract?: Contract

    constructor(address: string, location = "NFT constructor") {
        if (!address) {
            throw new MissingParameterError(location)
        }
        if (ethers.utils.isAddress(address)) {
            this.address = address
            return
        }
    }

    async approve(spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.approve(spender, tokenId)
        return { data, chain }
    }

    async approveForAll(spender: string, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.setApprovalForAll(spender, true)
        return { data, chain }
    }

    async getAddress(): Promise<string> {
        return this.address
    }

    async getContract(options: EnvOption = globalEnvOption): Promise<Contract> {
        const chain = await getChainFromData(options.chain)
        if (!this.contract) {
            const provider = await chain.getProvider()
            const addr = await this.getAddress()
            this.contract = new ethers.Contract(addr, erc721_abi, provider)
        }
        return this.contract
    }

    async getBalance(address: string, options: EnvOption = globalEnvOption): Promise<string> {
        const contract = await this.getContract(options)
        return await contract.balanceOf(address)
    }

    async getApproved(tokenId: string, options: EnvOption = globalEnvOption): Promise<string> {
        const contract = await this.getContract(options)
        return await contract.getApproved(tokenId)
    }

    async revokeForAll(spender: string, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.setApprovalForAll(spender, false)
        return { data, chain }
    }

    async transfer(sender: string, spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.transferFrom(sender, spender, tokenId)
        return { data, chain }
    }

    static async approve(data: string, spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.approve(spender, tokenId, options)
    }

    static async approveForAll(data: string, spender: string, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.approveForAll(spender, options)
    }

    static async getAddress(data: string): Promise<string> {
        const nft = new NFT(data)
        return await nft.getAddress()
    }

    static async getApproved(data: string, tokenId: string, options: EnvOption = globalEnvOption): Promise<string> {
        const nft = new NFT(data)
        return await nft.getApproved(tokenId, options)
    }

    static async getBalance(data: string, address: string, options: EnvOption = globalEnvOption): Promise<string> {
        const nft = new NFT(data)
        return await nft.getBalance(address, options)
    }

    static async revokeForAll(data: string, spender: string, options: EnvOption = globalEnvOption): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.revokeForAll(spender, options)
    }

    static async transfer(
        data: string,
        sender: string,
        spender: string,
        tokenId: number,
        options: EnvOption = globalEnvOption
    ): Promise<TransactionData> {
        const nft = new NFT(data)
        return await nft.transfer(sender, spender, tokenId, options)
    }
}
