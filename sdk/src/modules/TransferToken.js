const ethers = require("ethers")

const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const { Transaction } = require("../../utils/Transaction")
const BundlerTools = require('../../utils/actionUtils')
const { Module } = require('./Module')
const fetch = require('node-fetch')
const { DataServer } = require("../../utils/DataServer")
const ERC20 = require('../../utils/abis/ERC20.json')

const { Token, TokenTypes } = require("../../utils/Token")



// const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
const MAX_INT = ethers.constants.MaxUint256._hex
class TransferToken extends Module {

    async create() {
        return {}
    }

    async createTransfer(to, amount, ERC20Token) {
        const token = await Token.createFrom(ERC20Token)
        const ERC20Contract = new ethers.Contract(token.address, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }


}


module.exports = { TransferToken }