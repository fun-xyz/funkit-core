const ethers = require("ethers")
const ERC20 = require('../../utils/abis/ERC20.json')
const { Token } = require("../../utils/Token")
const { PrimitiveModule } = require("./PrimitiveModule")

class TokenTransfer extends PrimitiveModule {
    async createTransferTx(to, amount, ERC20Token) {
        // console.log(this.wallet.config.chainId, this.wallet.config)
        const token = new Token({ address: ERC20Token, chainId: this.wallet.config.chainId.toString() })
        const ERC20Contract = new ethers.Contract(await token.getAddress(), ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }

}

module.exports = { TokenTransfer }