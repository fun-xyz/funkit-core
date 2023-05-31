const { Contract } = require("ethers");
const { Interface } = require("ethers/lib/utils");
const { Token } = require("../data");
const { DataServer } = require("../servers");
const { parseOptions } = require("../utils/option");

const paymasterAbi = require("../abis/GaslessPaymaster.json").abi

class GaslessSponsor {
    constructor(options = global) {
        this.sponsorAddress = options.gasSponsor.sponsorAddress
        this.interface = new Interface(paymasterAbi)
    }

    async getPaymasterAddress(options = global) {
        const parsedOptions = await parseOptions(options)
        const chainId = await parsedOptions.chain.getChainId()
        if (!this.paymasterAddress && chainId != this.chainId) {
            this.paymasterAddress = await parsedOptions.chain.getAddress("gaslessSponsorAddress")
            this.chainId = chainId
        }
        return this.paymasterAddress
    }

    async getPaymasterAndData(options = global) {
        return await this.getPaymasterAddress(options) + this.sponsorAddress.slice(2)
    }

    async getContract(options = global) {
        if (!this.contract) {
            const parsedOptions = await parseOptions(options)
            const provider = await parsedOptions.chain.getProvider()
            const paymasterAddress = await this.getPaymasterAddress(parsedOptions)
            this.contract = new Contract(paymasterAddress, paymasterAbi, provider)
        }
        return this.contract
    }

    async getBalance(sponsor, options = global) {
        const contract = await this.getContract(options)
        return await contract.getBalance(sponsor)
    }

    async encode(data, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, data, chain: options.chain }
    }

    async encodeValue(data, value, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, value, data, chain: options.chain }
    }

    async getSpenderBlacklistMode(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getSpenderBlacklistMode(spender)
    }

    async getSpenderWhitelistMode(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getSpenderWhitelistMode(spender)
    }

    async getUnlockBlock(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getUnlockBlock(spender)
    }

    async getLockState(spender, options = global) {
        const unlockBlock = (await this.getUnlockBlock(spender)).toNumber()
        const parsedOptions = await parseOptions(options)
        const provider = await parsedOptions.chain.getProvider()
        const currentBlock = await provider.getBlockNumber()
        console.log(unlockBlock)
        if (1 <= unlockBlock && unlockBlock <= currentBlock) {
            return false
        }
        else return true
    }

    stake(walletAddress, amount) {
        return async (wallet, options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addDepositTo", [walletAddress, amountdec])
            await DataServer.addTransaction({
                action: "stake",
                amount,
                from: walletAddress,
                timestamp: Date.now(),
                to: await this.getPaymasterAddress(),
                token: "eth"
            }, "gasless", walletAddress)
            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress, amount) {
        return async (wallet, options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawDepositTo", [walletAddress, amountdec])
            await DataServer.addTransaction({
                action: "unstake",
                amount,
                from: walletAddress,
                timestamp: Date.now(),
                to: await this.getPaymasterAddress(),
                token: "eth"
            }, "gasless", walletAddress)
            return await this.encode(data, options)
        }
    }

    lockDeposit() {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("lockDeposit", [])
            return await this.encode(data, options)
        }
    }

    unlockDepositAfter(blocksToWait) {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("unlockDepositAfter", [blocksToWait])
            return await this.encode(data, options)
        }
    }

    setToBlacklistMode() {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("setListMode", [true])
            await DataServer.updatePaymasterMode({ mode: "blacklist" }, "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }

    setToWhitelistMode() {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("setListMode", [false])
            await DataServer.updatePaymasterMode({ mode: "whitelist" }, "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }

    addSpenderToWhiteList(spender) {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            await DataServer.addToList([spender], "walletsWhiteList", "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }
    removeSpenderFromWhiteList(spender) {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            await DataServer.removeFromList(spender, "walletsWhiteList", "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }

    addSpenderToBlackList(spender) {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            await DataServer.addToList([spender], "walletsBlackList", "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }

    removeSpenderFromBlackList(spender) {
        return async (wallet, options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            await DataServer.removeFromList(spender, "walletsBlackList", "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }

    batchBlacklistUsers(users, modes) {
        return async (options = global) => {
            let calldata = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderBlacklistMode", [users[i], modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            await DataServer.addBatch(users, modes, "walletsBlackList", "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }

    batchWhitelistUsers(users, modes) {
        return async (options = global) => {
            let calldata = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderWhitelistMode", [users[i], modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            await DataServer.addBatch(users, modes, "walletsWhiteList", "gasless", await wallet.getAddress())
            return await this.encode(data, options)
        }
    }
}

module.exports = { GaslessSponsor };