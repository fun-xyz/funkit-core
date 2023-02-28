const ethers = require("ethers")
const ERC20 = require('../../utils/abis/ERC20.json')
const { PrimitiveModule } = require("./PrimitiveModule")
const { TOKEN_TRANSFER_MODULE_NAME } = require('./Module')

class TokenTransfer extends PrimitiveModule {

    init() {
        this.name = TOKEN_TRANSFER_MODULE_NAME
    }

    async createTransferTx(to, amount, ERC20Token) {
        const ERC20Contract = new ethers.Contract(ERC20Token, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }
}

module.exports = { TokenTransfer }