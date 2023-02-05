const ethers = require("ethers")

const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const { Transaction } = require("../../utils/Transaction")

const ERC20 = require('../../utils/abis/ERC20.json')



const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

class AAVEWithdrawal {
    constructor(aTokenAddress, chainId, amount = MAX_INT,) {
        this.aTokenAddress = aTokenAddress
        this.amount = amount
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

    async getPreExecTxs(address = this.aTokenAddress) {
        return  [await this.deployTokenApproval(address)]
    }

    verifyRequirements() {

    }


    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {Transaction} 
    * Transaction - Transaction data
    */

    async deployTokenApproval(address) {
        const { to, data } = await this.contract.getMethodEncoding("approve", [address, this.amount])
        return new Transaction({ to, data })
    }
}


module.exports = { AAVEWithdrawal }