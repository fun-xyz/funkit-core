const ethers = require("ethers")
const ERC20 = require('../abis/ERC20.json')
const { PrimitiveModule } = require("./PrimitiveModule.js")

class TokenTransfer extends PrimitiveModule {
    static createTransferTx(to, amount, ERC20Token) {
        return async () => {
            const ERC20Contract = new ethers.Contract(ERC20Token, ERC20.abi)
            const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
            return { data: transferData }
            // return await this.createUserOpFromCallData(transferData)
        }
    }
}

module.exports = { TokenTransfer }