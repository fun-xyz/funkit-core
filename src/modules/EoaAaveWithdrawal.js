const { Transaction } = require("../../utils/Transaction")
const { Module, EOA_AAVE_WITHDRAWAL_MODULE_NAME } = require('./Module')
const Action = require("../../utils/abis/AaveWithdraw.json")
const ERC20 = require('../../utils/abis/ERC20.json')
const ethers = require("ethers")
const ABI = ethers.utils.defaultAbiCoder;
const { DataServer } = require("../../utils/DataServer")

class EoaAaveWithdrawal extends Module {

    async init(chainId) {
        const { eoaAaveWithdrawAddress } = await DataServer.getModuleInfo(EOA_AAVE_WITHDRAWAL_MODULE_NAME, chainId)
        this.addr = eoaAaveWithdrawAddress
        this.abi = Action.abi
    }

    async getPreExecTxs(tokenAddress, amount) {
        return [await this.deployTokenApproval(tokenAddress, amount)]
    }

    async verifyRequirements(tokenAddress, amount) {
        const contract = new ethers.Contract(tokenAddress, ERC20.abi, this.wallet.provider)
        const value = await contract.allowance(this.wallet.eoaAddr, this.wallet.address)
        return value.gte(ethers.BigNumber.from(amount))
    }

    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {Transaction} 
    * Transaction - Transaction data
    */
    async deployTokenApproval(tokenAddress, amount) {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi)
        const { to, data } = await tokenContract.populateTransaction.approve(this.wallet.address, amount)
        return new Transaction({ to, data })
    }

    async createWithdrawTx(tokenAddress, withdrawToAddress, amount) {
        const contract = new ethers.Contract(this.addr, this.abi)
        const aaveExec = ABI.encode(["address", "address", "uint256"], [withdrawToAddress, tokenAddress, amount])
        const actionExec = await contract.populateTransaction.execute(aaveExec)
        return await this.createUserOpFromCallData(actionExec, 560000, true, false)
    }
}

module.exports = { EoaAaveWithdrawal }