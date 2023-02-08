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
        const token = Token.createFrom(ERC20Token)
        // if (!ethers.utils.isAddress(ERC20address)) {
        //     let info = await DataServer.getTokenInfo(ERC20address.toLowerCase())
        //     if (!info[0].detail_platforms.ethereum) {
        //         throw Error("Token does not exist.")
        //     }
        //     ERC20address = info[0].detail_platforms.ethereum.contract_address
        // }
        console.log(token.address)
        const ERC20Contract = new ethers.Contract(token.address, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)
        return await this.createUserOpFromCallData(transferData)
    }


}


module.exports = { TransferToken }