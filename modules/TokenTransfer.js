const ethers = require("ethers")
const ERC20 = require('../abis/ERC20.json')
const { Token } = require("../../utils/Token")
const { PrimitiveModule } = require("./PrimitiveModule")

class TokenTransfer extends PrimitiveModule {
    async createTransferTx(to, amount, ERC20Token) {
        const ERC20Contract = new ethers.Contract(ERC20Token, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }
}

module.exports = { TokenTransfer }