import { BigNumber, Contract, ethers } from "ethers"
import { MissingParameterError, TransactionError, Helper } from "../errors"
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
    this.symbol = input
  }

  async approve(spender: string, amount: number, options: EnvOption = globalEnvOption): Promise<any> {
    // const chain = await getChainFromData(options.chain)
    // const contract = await this.getContract(options)
    // const amountDec = await this.getDecimalAmount(amount)
    // const data = await contract.populateTransaction.approve(spender, amountDec)
    // return { ...data, chain }
  }

  async approveForAll(spender: string, amount: number, options: EnvOption = globalEnvOption): Promise<any> {
    // const chain = await getChainFromData(options.chain)
    // const contract = await this.getContract(options)
    // const amountDec = await this.getDecimalAmount(amount)
    // const data = await contract.populateTransaction.approve(spender, amountDec)
    // return { ...data, chain }
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
    // balanceOf()
    // const chain = await getChainFromData(options.chain)
    // let amount
    // const contract = await this.getContract(options)
    // amount = await contract.balanceOf(address)
    // return formatUnits(amount, decimals)
  }

  async getApproval(owner: string, spender: string, options: EnvOption = globalEnvOption): Promise<BigNumber> {
    // if (this.isNative) {
    //   const helper = new Helper("approval", this, "Native nftcan not approve")
    //   throw new TransactionError("Token.getApproval", helper)
    // }
    // const contract = await this.getContract(options)
    // return await contract.allowance(owner, spender)
  }

  async transfer(spender: string, amount: number, options: EnvOption = globalEnvOption): Promise<any> {
    // const chain = await getChainFromData(options.chain)
    // const contract = await this.getContract(options)
    // const amountDec = await this.getDecimalAmount(amount)
    // const data = await contract.populateTransaction.transfer(spender, amountDec)
    // return { ...data, chain }
  }


  static async approve(data: string, spender: string, amount: number, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.approve(spender, amount, options)
  }

  static async approveForAll(data: string, spender: string, amount: number, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.approveForAll(spender, amount, options)
  }

  static async getAddress(data: string, options: EnvOption = globalEnvOption): Promise<string> {
    const nft = new NFT(data)
    return await nft.getAddress(options)
  }

  static async getApproval(data: string, owner: string, spender: string, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.getApproval(owner, spender, options)
  }

  static async getBalance(data: string, address: string, options: EnvOption = globalEnvOption): Promise<string> {
    const nft = new NFT(data)
    return await nft.getBalance(address, options)
  }

  static async transfer(data: string, spender: string, amount: number, options: EnvOption = globalEnvOption): Promise<any> {
    const nft = new NFT(data)
    return await nft.transfer(spender, amount, options)
  }
}
