const { Transaction } = require("../../utils/Transaction")
const { Module } = require('./Module')

const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const { generateSha256 } = require("../../utils/tools")

const Action = require("../../utils/abis/Action.json")
const ERC20 = require('../../utils/abis/ERC20.json')
const ethers = require("ethers")

const ABI = ethers.utils.defaultAbiCoder;
const EOA_AAVE_WITHDRAWAL_ADDR = "0x7127707D0515D465567A22A012a6740A3aA60501"

class EoaAaveWithdrawal extends Module {

    constructor(tokenAddress, chainId, amount = ethers.constants.MaxInt256,) {
        super(EOA_AAVE_WITHDRAWAL_ADDR)
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

    async createWithdraw(wallet) {
        return this.createExecAction(wallet)
    }

    async createExecAction(wallet) {        
        wallet.addContract(EOA_AAVE_WITHDRAWAL_ADDR, Action.abi)
        const input = [wallet.eoaAddr, this.tokenAddress]
        const key = generateSha256(input)
        const aaveexec = ABI.encode(["string"], [key])
        const actionExec = await wallet.contracts[EOA_AAVE_WITHDRAWAL_ADDR].getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await wallet.createAction(actionExec)

        return actionExecutionOp
    }

}


module.exports = { EoaAaveWithdrawal }