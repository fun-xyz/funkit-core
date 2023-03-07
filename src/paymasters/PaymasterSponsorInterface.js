const { execContractFunc, createErc, HARDHAT_FORK_CHAIN_ID } = require("../../utils/Web3utils")
const paymasterAbi = require("../../utils/abis/TokenPaymaster.json").abi
const { DataServer } = require("../../utils/DataServer")
const ethers = require("ethers")


/**
 * The PaymasterSponsorInterface class provides an interface to interact with the Paymaster smart contracts.
 * Currently, each call to a this.contract method is an EVM transaction.
 */
class PaymasterSponsorInterface {
    constructor(eoa) {
        this.eoa = eoa
    }

    // INIT RELATED

    async init() {
        if (!this.eoa.provider) {
            throw new Error("ethers.Wallet Object does not contain a provider. Use either: wallet.connect(provider) or on creation: const wallet = new ethers.Wallet(privatekey,provider)")
        }

        const { chainId } = await this.eoa.provider.getNetwork()
        this.eoaAddress = await this.eoa.getAddress()
        this.paymasterAddress = await DataServer.getPaymasterAddress(chainId)

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



    // DEPOSIT MANIPULTION 

    // token specific

    async addTokenDepositTo(account, amount) {
        this.errorCatcher()
        await this._tokenApproval(amount)
        const txData = await this.contract.populateTransaction.addTokenDepositTo(account, amount)
        return await execContractFunc(this.eoa, txData)
    }

    async withdrawTokenDepositTo(target, amount) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.withdrawTokenDepositTo(target, amount)
        return await execContractFunc(this.eoa, txData)
    }

    // eth specific

    async addEthDepositForSponsor(value, sponsor = this.eoaAddress) {
        this.errorCatcher()
        const depositData = await this.contract.populateTransaction.addEthDepositForSponsor(sponsor)
        const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
        return await execContractFunc(this.eoa, tx)
    }

    async withdrawEthDepositTo(target, amount) {
        this.errorCatcher()
        const whitelistData = await this.contract.populateTransaction.withdrawEthDepositTo(target, amount)
        return await execContractFunc(this.eoa, whitelistData)
    }


    // WHITELIST OPERATION

    async setWhitelistMode(mode) {
        this.errorCatcher()
        const whitelistData = await this.contract.populateTransaction.setWhitelistMode(mode)
        return await execContractFunc(this.eoa, whitelistData)
    }
    async setSpenderToBlackListMode(spender, mode) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setSpenderToBlackListMode(spender, mode)
        return await execContractFunc(this.eoa, txData)

    }
    async setSponsorApproval(spender, isWhiteListed) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setSponsorApproval(spender, isWhiteListed)
        return await execContractFunc(this.eoa, txData)
    }



    // LOCK/UNLOCK BLOCKs

    //token specific
    async unlockTokenDeposit() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.unlockTokenDeposit()
        return await execContractFunc(this.eoa, txData)
    }
    async lockTokenDeposit() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.lockTokenDeposit()
        return await execContractFunc(this.eoa, txData)
    }

    //eth specific
    async lockSponsorEntrypointStake() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.lockSponsorEntrypointStake();
        return await execContractFunc(this.eoa, txData)
    }

    async unlockSponsorEntrypointStakeAfter(blockNum) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.unlockSponsorEntrypointStakeAfter(blockNum);
        return await execContractFunc(this.eoa, txData)
    }



    // INTERNAL ERC20 HELPERS
    async _tokenApproval(amount) {
        await this._loadToken()
        const sendamt = amount instanceof ethers.BigNumber ? amount : ethers.utils.parseUnits(amount, this.decimals)
        const txData = await this.erc20Token.populateTransaction.approve(this.paymasterAddress, sendamt)
        const data = await execContractFunc(this.eoa, txData)

    }

    async _loadToken() {
        if (this.decimals) return;
        const token = await this.contract.getToken()
        this.erc20Token = createErc(token, this.eoa.provider)
        this.decimals = await this.erc20Token.decimals()
    }

}

module.exports = { PaymasterSponsorInterface }