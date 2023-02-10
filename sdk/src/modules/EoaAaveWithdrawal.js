const ethers = require("ethers")
const { Module } = require('./Module')
const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const { Transaction } = require("../../utils/Transaction")
const Action = require("../../utils/abis/Action.json")
const ERC20 = require('../../utils/abis/ERC20.json')
const { generateSha256 } = require("../../utils/tools")
const BundlerTools = require('../../utils/actionUtils')
const abi = ethers.utils.defaultAbiCoder;

class EoaAaveWithdrawal extends Module {
    actionAddr = "0x7127707D0515D465567A22A012a6740A3aA60501"

    constructor(tokenAddress, chainId, amount = ethers.constants.MaxInt256,) {
        super()
        this.tokenAddress = tokenAddress
        this.amount = amount
        this.chainId = chainId
        const eoa = ethers.Wallet.createRandom()
        this.contract = createWrappedContract(tokenAddress, ERC20.abi, eoa, {}, chainId)
        //todo get action from translation server
    }



    async getPreExecTxs(wallet) {
        return [await this.deployTokenApproval(wallet.address, this.amount)]
    }

    async verifyRequirements(wallet) {
        const contract = new ethers.Contract(this.tokenAddress, ERC20.abi, wallet.provider)
        const value = await contract.allowance(wallet.eoaAddr, wallet.address)
        return value.gte(ethers.BigNumber.from(this.amount))
    }


    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {Transaction} 
    * Transaction - Transaction data
    */

    async deployTokenApproval(address, amt) {
        const { to, data } = await this.contract.getMethodEncoding("approve", [address, amt])
        return new Transaction({ to, data })
    }

    async createWithdraw(params, wallet) {
        return this.createExecAction(params, wallet)
    }

    async createExecAction(params , wallet) {
        
        wallet.addContract(this.actionAddr, Action.abi)
        const input = [wallet.eoaAddr, this.tokenAddress]
        const key = generateSha256(input)
        const aaveexec = abi.encode(["string"], [key])
        const actionExec = await wallet.contracts[this.actionAddr].getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await wallet.createAction(actionExec)

        return actionExecutionOp
    }

}


module.exports = { EoaAaveWithdrawal }