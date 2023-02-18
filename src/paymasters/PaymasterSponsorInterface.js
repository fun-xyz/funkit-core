const ethers = require("ethers")
const { execContractFunc, createErc } = require("../../test/TestUtils")
const paymasterAbi = require("../../utils/abis/TokenPaymaster.json").abi


class PaymasterSponsorInterface {
    constructor(eoa) {
        this.eoa = eoa
    }
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
    }

    async addEthDepositForSponsor(value, sponsor = this.eoaaddress) {
        const depositData = await this.contract.populateTransaction.addEthDepositForSponsor(sponsor)
        const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
        await execContractFunc(eoa, tx)
    }

    async withdrawEthDepositTo(target, amount) {
        const whitelistData = await this.contract.populateTransaction.withdrawEthDepositTo(target, amount)
        await execContractFunc(eoa, whitelistData)
    }

    async addTokenDepositTo(account, amount) {
        await this.tokenApproval(amount)
        const txData = await this.contract.populateTransaction.addTokenDepositTo(account, amount)
        await execContractFunc(eoa, txData)
    }

    async withdrawTokenDepositTo(target, amount) {
        const txData = await this.contract.populateTransaction.withdrawTokenDepositTo(target, amount)
        await execContractFunc(eoa, txData)
    }

    async lockTokenDeposit() {
        const lockData = await this.contract.populateTransaction.lockTokenDeposit()
        await execContractFunc(eoa, lockData)
    }
    async setWhitelistMode(mode) {
        const whitelistData = await this.contract.populateTransaction.setWhitelistMode(mode)
        await execContractFunc(eoa, whitelistData)
    }
    async setSpenderToBlackListMode(spender, mode) {
        const txData = await this.contract.populateTransaction.setSpenderToBlackListMode(spender, mode)
        await execContractFunc(eoa, txData)

    }
    async setSponsorApproval(spender, isWhiteListed) {
        const txData = await this.contract.populateTransaction.setSponsorApproval(spender, isWhiteListed)
        await execContractFunc(eoa, txData)
    }

    async tokenApproval(amount) {
        await this.loadToken()
        const txData = await this.erc.populateTransaction.approve(this.contract, ethers.utils.parseUnits(amount, this.decimals))
        await execContractFunc(eoa, txData)
    }

    async loadToken() {
        if (this.decimals) return;
        const token = await this.contract.getToken()
        this.erc = createErc(token, this.eoa.provider)
        this.decimals = await this.erc.decimals()
    }

}