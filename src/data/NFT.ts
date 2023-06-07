import { Contract, ethers } from "ethers"
import { getChainFromData } from "./Chain"
import { getNftAddress, getNftName } from "../apis/NFTApis"
import { ERC_721_ABI, TransactionData } from "../common"
import { EnvOption } from "../config"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"
export class NFT {
    address = ""
    name = ""
    contract?: Contract

    constructor(input: string, location = "NFT constructor") {
        if (!input) {
            throw new MissingParameterError(location)
        }
        if (ethers.utils.isAddress(input)) {
            this.address = input
            return
        }
        this.name = input
    }

    async approve(spender: string, tokenId: number, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.approve(spender, tokenId)
        return { ...data, chain }
    }

    async approveForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.setApprovalForAll(spender, true)
        return { ...data, chain }
    }

    async getAddress(): Promise<string> {
        if (this.name && !this.address) {
            const nft = await getNftAddress(this.name)
            if (nft.error) {
                const helper = new Helper("getName", "", "call failed")
                helper.pushMessage(`NFT address for ${this.name} not found`)
                throw new ServerMissingDataError("NFT.getAddress", "NFT", helper)
            } else {
                return nft.address
            }
        }
        return this.address
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

    async getContract(options: EnvOption = (globalThis as any).globalEnvOption): Promise<Contract> {
        const chain = await getChainFromData(options.chain)
        if (!this.contract) {
            const provider = await chain.getProvider()
            const addr = await this.getAddress()
            this.contract = new ethers.Contract(addr, ERC_721_ABI, provider)
        }
        return this.contract
    }

    async getBalance(address: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const contract = await this.getContract(options)
        return await contract.balanceOf(address)
    }

    async getApproved(tokenId: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const contract = await this.getContract(options)
        return await contract.getApproved(tokenId)
    }

    async revokeForAll(spender: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.setApprovalForAll(spender, false)
        return { ...data, chain }
    }

    async transfer(
        sender: string,
        spender: string,
        tokenId: number,
        options: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<any> {
        const chain = await getChainFromData(options.chain)
        const contract = await this.getContract(options)
        const data = await contract.populateTransaction.transferFrom(sender, spender, tokenId)
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

    static async getBalance(data: string, address: string, options: EnvOption = (globalThis as any).globalEnvOption): Promise<string> {
        const nft = new NFT(data)
        return await nft.getBalance(address, options)
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
