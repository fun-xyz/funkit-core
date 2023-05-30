import { Contract, ethers } from "ethers"
import { MissingParameterError } from "../errors"
import erc721_abi from "../abis/ERC721.json"
import { getChainFromData } from "./Chain"
import { EnvOption } from "src/config/config"

export class NFT {
  address = ""
  symbol = ""
  contract?: Contract

  constructor(input: string, location = "NFT constructor") {
    if (!input) {
      throw new MissingParameterError(location)
    }
    if (ethers.utils.isAddress(input)) {
      this.address = input
      return
    }
  }

  async approve(spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<any> {
    const chain = await getChainFromData(options.chain)
    const contract = await this.getContract(options)
    const data = await contract.populateTransaction.approve(spender, tokenId)
    return { ...data, chain }
  }

  async approveForAll(spender: string, options: EnvOption = globalEnvOption): Promise<any> {
    const chain = await getChainFromData(options.chain)
    const contract = await this.getContract(options)
    const data = await contract.populateTransaction.setApprovalForAll(spender, true)
    return { ...data, chain }
  }

  async getAddress(options: EnvOption = globalEnvOption): Promise<any> {
    if (this.address) {
      return this.address
    }
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
    const chain = await getChainFromData(options.chain)
    const contract = await this.getContract(options)
    const data = await contract.balanceOf(address)
    return { ...data, chain }
  }

  async getApproval(tokenId: string, options: EnvOption = globalEnvOption): Promise<string> {
    const contract = await this.getContract(options)
    return await contract.getApproved(tokenId)
  }

  async revokeForAll(spender: string, options: EnvOption = globalEnvOption): Promise<any> {
    const chain = await getChainFromData(options.chain)
    const contract = await this.getContract(options)
    const data = await contract.populateTransaction.setApprovalForAll(spender, false)
    return { ...data, chain }
  }

  async transfer(spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<any> {
    const chain = await getChainFromData(options.chain)
    const contract = await this.getContract(options)
    const addr = await this.getAddress()
    const data = await contract.populateTransaction.safeTransferFrom(addr, spender, tokenId)
    return { ...data, chain }
  }

  static async approve(data: string, spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.approve(spender, tokenId, options)
  }

  static async approveForAll(data: string, spender: string, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.approveForAll(spender, options)
  }

  static async getAddress(data: string, options: EnvOption = globalEnvOption): Promise<string> {
    const nft = new NFT(data)
    return await nft.getAddress(options)
  }

  static async getApproval(data: string, tokenId: string, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.getApproval(tokenId, options)
  }

  static async getBalance(data: string, address: string, options: EnvOption = globalEnvOption): Promise<string> {
    const nft = new NFT(data)
    return await nft.getBalance(address, options)
  }

  static async revokeForAll(data: string, spender: string, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.approveForAll(spender, options)
  }

  static async transfer(data: string, spender: string, tokenId: number, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.transfer(spender, tokenId, options)
  }
}
