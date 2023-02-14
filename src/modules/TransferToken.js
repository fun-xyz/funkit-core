const ethers = require("ethers")
const ERC20 = require('../../utils/abis/ERC20.json')
const { Token } = require("../../utils/Token")
const { PrimitiveModule } = require("./PrimitiveModule")

class TransferToken extends PrimitiveModule {
    async createTransfer(to, amount, ERC20Token) {
        const token = await Token.createFrom(ERC20Token)
        const ERC20Contract = new ethers.Contract(token.address, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }
}

module.exports = { TransferToken }