const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const ERC20 = require('../../utils/abis/ERC20.json')
const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

class AAVEWithdrawal {
    constructor(eoa, aTokenAddress, chainId, amount = MAX_INT,) {
        this.aTokenAddress = aTokenAddress
        this.amount = amount
        this.contract = createWrappedContract(aTokenAddress, ERC20.abi, eoa, {}, chainId)
        this.eoa=eoa
    }
    create(...params) {
        params.push(this.aTokenAddress)
        return {
            type: "AAVE",
            params
        }
    }
    async getPreExecTxs(address) {
        return await this.deployTokenApproval(address)
    }
    verifyRequirements() {

    }
    async deployTokenApproval(address) {
        const ethTx = await this.contract.getMethodEncoding("approve", [address, this.amount])
        const submittedTx = await this.eoa.sendTransaction(ethTx);
        const receipt = await submittedTx.wait()

        return receipt
    }
}


module.exports = { AAVEWithdrawal }