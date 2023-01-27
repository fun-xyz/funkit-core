const { FunWallet } = require("../funWallet")
const { ethers } = require("ethers")
const abi = ethers.utils.defaultAbiCoder;

const pooldata = require("../../utils//abis/IPool.json")
const ercdata = require("../../utils//abis/ERC20.json")
const { ContractsHolder } = require("../../utils/ContractsHolder")
const { generateSha256 } = require("../../utils/tools")

const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

const healthFactorLow = ethers.utils.parseEther("1")

const pool = "0xb47673b7a73D78743AFF1487AF69dBB5763F00cA" // Pool-Proxy-AVAX
const supplyAddr = "0x096058932cAA96B1deDf2F6bd56F693aD7cd4456"
const withdrawAddr = "0x672d9623EE5Ec5D864539b326710Ec468Cfe0aBE"

class AAVEWallet extends FunWallet {
    constructor(eoa, schema, prefundAmt, chain, apiKey, index = 0, poolAddr = pool) {
        super(eoa, schema, prefundAmt, chain, apiKey, index)
        this.poolAddr = poolAddr
        this.contracts = {}
        this.addContract(this.poolAddr, pooldata.abi)
    }

    async _getPoolAssetData(underLyingAssetAddr) {
        return await this.contracts[this.poolAddr].callMethod("getReserveData", [underLyingAssetAddr])
    }

    async approvePool(tokenAddress, amt) {
        const approvalReceipt = await this.sendTokenApprovalTx(tokenAddress, amt, this.poolAddr)
        console.log("approved: ", approvalReceipt)
    }

    async approveWallet(tokenAddress, amt) {
        const approvalReceipt = await this.sendTokenApprovalTx(tokenAddress, amt, this.address)
        console.log("approved: ", approvalReceipt)
    }

    async createWithdrawal(tokenAddr, amt = MAX_INT) {
        this.addContract(withdrawAddr, Action.abi)

        await this.approveWallet(tokenAddress, amt)

        const input = [this.eoaAddr, tokenAddr]
        const key = generateSha256(input)

        const aaveWithdrawData = abi.encode(["address", "address", "string"], [...input, key]);
        const actionInitData = await this.contracts[withdrawAddr].getMethodEncoding("init", [aaveWithdrawData])
        return actionInitData
    }

    async createSupply(tokenAddress, amt = 0) {
        this.addContract(tokenAddress, ercdata.abi)
        const useraddr = this.eoaAddr
        if (amt == 0) {
            amt = await this.contracts[tokenAddress].callMethod("balanceOf", [useraddr])
        }

        await this.approveWallet(tokenAddress, amt)

        const input = [this.eoaAddr, this.poolAddr, tokenAddress]
        const key = generateSha256(input)

        // const tx = await this.contracts[this.poolAddr].getMethodEncoding("supply", [tokenAddress, amt, useraddr, 0])
        const aaveWithdrawData = abi.encode(["address", "address", "address", "uint256", "string"], [...input, amount, key]);
        const actionInitData = await this.contracts[supplyAddr].getMethodEncoding("init", [aaveWithdrawData])

        return await this._createAction(actionInitData)
    }

    async execSupply(tokenAddress, amt = 0) {
        this.addContract(tokenAddress, ercdata.abi)
        const useraddr = this.eoaAddr
        if (amt == 0) {
            amt = await this.contracts[tokenAddress].callMethod("balanceOf", [useraddr])
        }

        const input = [this.eoaAddr, this.poolAddr, tokenAddress]
        const key = generateSha256(input)
        const aaveWithdrawData = abi.encode(["string"], [key]);

        const actionExecData = await this.contracts[supplyAddr].getMethodEncoding("execute", [aaveWithdrawData])
        return actionExecData
    }

    async repay(tokenAddress, type, amount) {
        this.addContract(tokenAddress, ercdata.abi)
        await this.approvePool(tokenAddress, amount)
        const balance = await this.contracts[tokenAddress].callMethod("balanceOf", [this.eoaAddr])
        if (balance.lte(amount)) {
            amount = balance
            console.log("Repay amount higher than account balance")
        }
        const tx = await this.contracts[this.poolAddr].getMethodEncoding("repay", [tokenAddress, amount, type, this.eoaAddr])
        return this._createAction(tx, 560000, true)


    }

    async repayAll(tokenAddress) {
        this.addContract(tokenAddress, ercdata.abi)
        const { stableDebtTokenAddress, variableDebtTokenAddress } = await this._getPoolAssetData(tokenAddress)
        this.addContracts([stableDebtTokenAddress, variableDebtTokenAddress], ercdata.abi)

        const stableDebtBalance = await this.contracts[stableDebtTokenAddress].callMethod("balanceOf", [this.eoaAddr])
        const variableDebtBalance = await this.contracts[variableDebtTokenAddress].callMethod("balanceOf", [this.eoaAddr])

        if (!stableDebtBalance.isZero()) {
            return await this.repay(tokenAddress, 1, stableDebtBalance)
        }
        if (!variableDebtBalance.isZero()) {
            return await this.repay(tokenAddress, 2, variableDebtBalance)
        }

    }

    async _getUserAccountData(userAddr) {
        return await this.contracts[this.poolAddr].callMethod("getUserAccountData", [userAddr])
    }

    async liquidateCall(collateralAddr, reserveAddress, userAddr, debtToCover = MAX_INT, receiveAToken = false) {
        const { healthFactor } = await this._getUserAccountData(userAddr)
        if (healthFactor.lt(healthFactorLow)) {
            console.log("risk available")
        }
    }

}

module.exports = { AAVEWallet }