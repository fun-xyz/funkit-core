const ethers = require("ethers")

const { createWrappedContract } = require("../../utils/WrappedEthersContract")
const { Transaction } = require("../../utils/Transaction")
const BundlerTools = require('../../utils/actionUtils')
const { Module } = require('./Module')
const ERC20 = require('../../utils/abis/ERC20.json')



const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

class TransferToken extends Module {

    constructor(to, amount, ERC20addr, chainId = '43113') {
        super()
        this.to = to
        this.ERC20addr = ERC20addr
        this.amount = amount
        // const eoa = ethers.Wallet.createRandom()
        // this.contract = createWrappedContract(ERC20addr, ERC20.abi, eoa, {}, chainId)
    }
    create(...params) {
        params.push(this.to, this.amount, this.ERC20addr)
        // params.push(this.amount)
        // params.push(this.ERC20addr)
        return {
            type: "TRANSFER",
            params,
            noInit: true
        }
    }


    // async transferFrom() {
    //     const { to, data } = await this.contract.getMethodEncoding("transfer", [address, funWalletAddress, this.amount])
    //     const actionExecutionOp = await BundlerTools.createAction(this.accountApi, actionExec, 500000, true)
    //
    //     return new Transaction({ to, data })
    // }


}


module.exports = { TransferToken }