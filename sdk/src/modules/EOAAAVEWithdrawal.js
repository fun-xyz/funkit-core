const ethers = require("ethers")

const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const { Transaction } = require("../../utils/Transaction")

const ERC20 = require('../../utils/abis/ERC20.json')





class AAVEWithdrawal {
    constructor(aTokenAddress, chainId, amount = ethers.constants.MaxInt256,) {
        this.aTokenAddress = aTokenAddress
        this.amount = amount
        this.chainId = chainId
        const eoa = ethers.Wallet.createRandom()
        this.contract = createWrappedContract(aTokenAddress, ERC20.abi, eoa, {}, chainId)
    }
    create(...params) {
        params.push(this.aTokenAddress)
        return {
            type: "AAVE",
            params
        }
    }

    async getPreExecTxs(wallet) {
        return [await this.deployTokenApproval(wallet.address, this.amount)]
    }

    async verifyRequirements(wallet) {
        const contract = new ethers.Contract(this.aTokenAddress, ERC20.abi, wallet.provider)
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
}


module.exports = { AAVEWithdrawal }