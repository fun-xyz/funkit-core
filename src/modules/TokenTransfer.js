const ethers = require("ethers")
const ERC20 = require('../../utils/abis/ERC20.json')
const { Token } = require("../../utils/Token")
const { PrimitiveModule } = require("./PrimitiveModule")

class TokenTransfer extends PrimitiveModule {
    async createTransfer(to, amount, ERC20Token) {
        const token = await Token.createToken(ERC20Token)
        const ERC20Contract = new ethers.Contract(token.address, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }
    async getPreExecTxs() {
        return []
    }
}

module.exports = { TokenTransfer }