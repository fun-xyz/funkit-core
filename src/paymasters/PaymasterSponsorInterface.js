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
        this.paymasterAddress = await this.getPaymasterAddress(chainId)
        if (!this.eoa.provider) {
            throw new Error("ethers.Wallet Object does not contain a provider. Use either: wallet.connect(provider) or on creation: const wallet = new ethers.Wallet(privatekey,provider)")
        }
        this.contract = new ethers.Contract(this.paymasterAddress, paymasterAbi, this.eoa.provider)
    }

    async getPaymasterAddress(chainId) {
        if (chainId == 31337) {
            const addr = require("../../test/testConfig.json").paymasterAddress
            return addr
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
        console.log(account)
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

    async addEthDepositForSponsor(value, sponsor = this.eoaaddress) {
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

    errorCatcher() {
        if (!this.eoaaddress) {
            throw new Error("Paymaster Interface has not been initialized.")
        }
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
        console.log("\n")
        console.log(await this.erc20Token.allowance(this.eoa.address, this.paymasterAddress))
        console.log("\n")

    }

    async _loadToken() {
        if (this.decimals) return;
        const token = await this.contract.getToken()
        this.erc20Token = createErc(token, this.eoa.provider)
        this.decimals = await this.erc20Token.decimals()
    }

}

module.exports = { PaymasterSponsorInterface }