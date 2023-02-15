const { Transaction } = require("../../utils/Transaction")
const { Module } = require('./Module')
const Action = require("../../utils/abis/AaveWithdraw.json")
const UserOpUtils = require('../../utils/UserOpUtils')
const ERC20 = require('../../utils/abis/ERC20.json')
const ethers = require("ethers")
const ABI = ethers.utils.defaultAbiCoder;
const EOA_AAVE_WITHDRAWAL_ADDR = require("../../test/contractConfig.json").aaveWithdrawAddress
class EoaAaveWithdrawal extends Module {
    constructor() {
        super(EOA_AAVE_WITHDRAWAL_ADDR)
        this.abi = Action.abi
    }

    async getPreExecTxs(tokenAddress, amount = ethers.constants.MaxInt256) {
        return [await this.deployTokenApproval(tokenAddress, amount)]
    }

    async verifyRequirements(tokenAddress, amount = ethers.constants.MaxInt256) {
        const contract = new ethers.Contract(tokenAddress, ERC20.abi, this.wallet.provider)
        const value = await contract.allowance(this.wallet.eoaAddr, this.wallet.address)
        return value.gte(ethers.BigNumber.from(amount))
    }

    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {Transaction} 
    * Transaction - Transaction data
    */
    async deployTokenApproval(tokenAddress, amount = ethers.constants.MaxInt256) {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20.abi)
        const { to, data } = await tokenContract.populateTransaction.approve(this.wallet.address, amount)
        return new Transaction({ to, data })
    }

    async createWithdraw(tokenAddress, withdrawToAddress, amount = ethers.constants.MaxInt256) {
        const contract = new ethers.Contract(this.addr, this.abi)
        const aaveExec = ABI.encode(["address", "address", "uint256"], [withdrawToAddress, tokenAddress, amount])
        const actionExec = await contract.populateTransaction.execute(aaveExec)
        const userOpTx = await UserOpUtils.createUserOpTransaction(this.wallet.dataServer, this.wallet.accountApi, actionExec, 560000, true)
        return userOpTx
    }

}

module.exports = { EoaAaveWithdrawal }