const { execContractFunc, createErc, HARDHAT_FORK_CHAIN_ID } = require("../../utils/Web3utils")
const paymasterAbi = require("../../utils/abis/TokenPaymaster.json").abi
const { DataServer } = require("../../utils/DataServer")
const ethers = require("ethers")
const { BasePaymaster } = require("./BasePaymaster")


/**
 * The PaymasterInterface class provides an interface to interact with the Paymaster smart contracts.
 * Currently, each call to a this.contract method is an EVM transaction.
 */
class PaymasterInterface extends BasePaymaster {
    batchData = []
    stakeBatchData = []
    constructor(eoa) {
        super()
        this.eoa = eoa
    }


    // INIT RELATED

    async init() {
        if (!this.eoa.provider) {
            throw new Error("ethers.Wallet Object does not contain a provider. Use either: wallet.connect(provider) or on creation: const wallet = new ethers.Wallet(privatekey,provider)")
        }

        const { chainId } = await this.eoa.provider.getNetwork()
        this.paymasterAddress = await DataServer.getPaymasterAddress(chainId)
        this.eoaAddress = await this.eoa.getAddress()
        this.contract = new ethers.Contract(this.paymasterAddress, paymasterAbi, this.eoa.provider)
    }


    // GET DEPOSIT INFO

    async depositInfo(account) {
        this.errorCatcher()
        return await this.contract.depositInfo(account);
    }

    async getEthDepositInfoForSponsor(sponsor) {
        this.errorCatcher()
        return await this.contract.getEthDepositInfoForSponsor(sponsor);
    }

    async getUnlockBlockWithSponsor(account, sponsor) {
        this.errorCatcher()
        return await this.contract.getUnlockBlockWithSponsor(account, sponsor);
    }

    // ERROR CATCH

    errorCatcher() {
        if (!this.eoaAddress) {
            throw new Error("Paymaster Interface has not been initialized.")
        }
    }

    // BATCH

    async _addToBatch(data) {
        this.batchData.push(data)
    }

    async _addToStakeBatch(data) {
        this.stakeBatchData.push(data)
    }

    async deploy() {
        this.errorCatcher()
        for (let tx of this.stakeBatchData) {
            await execContractFunc(this.eoa, tx)
        }

        let val = ethers.BigNumber.from(0)
        const outdata = this.batchData.map(({ data, value }) => {
            if (value) {
                val.add(value)
            }
            return data
        })
        const txData = await this.contract.populateTransaction.batchActions(outdata)
        this.batchData = []
        this.stakeBatchData = []
        return await execContractFunc(this.eoa, txData)
    }



    // DEPOSIT MANIPULTION 

    // token specific

    async addTokenDepositTo(account, amount) {
        this.errorCatcher()
        await this._tokenApproval(amount)
        const txData = await this.contract.populateTransaction.addTokenDepositTo(account, amount)
        await this._addToBatch(txData)
    }

    async withdrawTokenDepositTo(target, amount) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.withdrawTokenDepositTo(target, amount)
        await this._addToBatch(txData)
    }

    // eth specific

    async addEthDepositForSponsor(value, sponsor = this.eoaAddress) {
        this.errorCatcher()
        const amount = ethers.utils.parseEther(value.toString())
        const depositData = await this.contract.populateTransaction.addEthDepositForSponsor(sponsor, amount)
        const txData = { ...depositData, value: amount }
        await this._addToBatch(txData)
    }

    async withdrawEthDepositTo(target, amount) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.withdrawEthDepositTo(target, amount)
        await this._addToBatch(txData)
    }


    // WHITELIST OPERATION

    async setWhitelistMode(mode) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setWhitelistMode(mode)
        await this._addToBatch(txData)
    }
    async setSpenderToBlackListMode(spender, mode) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setSpenderToBlackListMode(spender, mode)
        await this._addToBatch(txData)

    }
    async setSponsorApproval(spender, isWhiteListed) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setSponsorApproval(spender, isWhiteListed)
        await this._addToBatch(txData)
    }



    // LOCK/UNLOCK BLOCKs

    //token specific
    async unlockTokenDeposit() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.unlockTokenDeposit()
        await this._addToBatch(txData)
    }
    async lockTokenDeposit() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.lockTokenDeposit()
        await this._addToBatch(txData)
    }

    //eth specific
    async lockSponsorEntrypointStake() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.lockSponsorEntrypointStake();
        await this._addToBatch(txData)
    }

    async unlockSponsorEntrypointStakeAfter(blockNum) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.unlockSponsorEntrypointStakeAfter(blockNum);
        await this._addToBatch(txData)
    }




    // INTERNAL ERC20 HELPERS
    async _tokenApproval(amount) {
        await this._loadToken()
        const sendamt = amount instanceof ethers.BigNumber ? amount : ethers.utils.parseUnits(amount, this.decimals)
        const txData = await this.erc20Token.populateTransaction.approve(this.paymasterAddress, sendamt)
        await this._addToStakeBatch(txData)
    }

    async _loadToken() {
        if (this.decimals) return;
        const token = await this.contract.getToken()
        this.erc20Token = createErc(token, this.eoa.provider)
        this.decimals = await this.erc20Token.decimals()
    }

}

module.exports = { PaymasterInterface }