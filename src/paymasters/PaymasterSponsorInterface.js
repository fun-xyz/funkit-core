const ethers = require("ethers")
const { execContractFunc, createErc } = require("../../test/TestUtils")
const { DataServer } = require("../../utils/DataServer")
const paymasterAbi = require("../../utils/abis/TokenPaymaster.json").abi


class PaymasterSponsorInterface {
    constructor(eoa) {
        this.eoa = eoa
    }



    // INIT RELATED

    async init() {
        const net = await this.eoa.provider.getNetwork()
        this.eoaaddress = await this.eoa.getAddress()
        const chainId = net.chainId
        const paymasterAddress = await this.getPaymasterAddress(chainId)
        if (!this.eoa.provider) {
            throw new Error("ethers.Wallet Object does not contain a provider. Use either: wallet.connect(provider) or on creation: const wallet = new ethers.Wallet(privatekey,provider)")
        }
        this.contract = new ethers.Contract(paymasterAddress, paymasterAbi, this.eoa.provider)
    }

    async getPaymasterAddress(chainId) {
        if (chainId == 31337) {
            console.log(chainId)
            return require("../../test/testConfig.json").paymasterAddress
        }
        const { aaData: { paymasterAddress } } = await DataServer.getChainInfo(this.chainId)
        return paymasterAddress
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



    // DEPOSIT MANIPULTION 

    // token specific

    async addTokenDepositTo(account, amount) {
        this.errorCatcher()
        await this._tokenApproval(amount)
        // console.log(account, amount)
        // const txData = await this.contract.populateTransaction.addTokenDepositTo(account, amount)
        // await execContractFunc(this.eoa, txData)
    }

    async withdrawTokenDepositTo(target, amount) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.withdrawTokenDepositTo(target, amount)
        await execContractFunc(this.eoa, txData)
    }

    // eth specific

    async addEthDepositForSponsor(value, sponsor = this.eoaaddress) {
        this.errorCatcher()
        const depositData = await this.contract.populateTransaction.addEthDepositForSponsor(sponsor)
        const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
        await execContractFunc(this.eoa, tx)
    }

    async withdrawEthDepositTo(target, amount) {
        this.errorCatcher()
        const whitelistData = await this.contract.populateTransaction.withdrawEthDepositTo(target, amount)
        await execContractFunc(this.eoa, whitelistData)
    }

    errorCatcher() {
        if (!this.eoaaddress) {
            throw new Error("Paymaster Interface has not been initialized.")
        }
    }


    // WHITELIST OPERATION

    async setWhitelistMode(mode) {
        this.errorCatcher()
        const whitelistData = await this.contract.populateTransaction.setWhitelistMode(mode)
        await execContractFunc(this.eoa, whitelistData)
    }
    async setSpenderToBlackListMode(spender, mode) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setSpenderToBlackListMode(spender, mode)
        await execContractFunc(this.eoa, txData)

    }
    async setSponsorApproval(spender, isWhiteListed) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.setSponsorApproval(spender, isWhiteListed)
        await execContractFunc(this.eoa, txData)
    }



    // LOCK/UNLOCK BLOCKs

    //token specific
    async unlockTokenDeposit() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.unlockTokenDeposit()
        await execContractFunc(this.eoa, txData)
    }
    async lockTokenDeposit() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.lockTokenDeposit()
        await execContractFunc(this.eoa, txData)
    }

    //eth specific
    async lockSponsorEntrypointStake() {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.lockSponsorEntrypointStake();
        await execContractFunc(this.eoa, txData)
    }

    async unlockSponsorEntrypointStakeAfter(blockNum) {
        this.errorCatcher()
        const txData = await this.contract.populateTransaction.unlockSponsorEntrypointStakeAfter(blockNum);
        await execContractFunc(this.eoa, txData)
    }



    // INTERNAL ERC20 HELPERS
    async _tokenApproval(amount) {
        await this._loadToken()
        const sendamt = amount instanceof ethers.BigNumber ? amount : ethers.utils.parseUnits(amount, this.decimals)
        // const txData = await this.erc20Token.populateTransaction.approve(this.contract, sendamt)
        // await execContractFunc(this.eoa, txData)
    }

    async _loadToken() {
        if (this.decimals) return;
        const token = await this.contract.getToken()
        this.erc20Token = createErc(token, this.eoa.provider)
        this.decimals = await this.erc20Token.decimals()
    }

}

module.exports = { PaymasterSponsorInterface }