const { JsonRpcProvider } = require("@ethersproject/providers")
const { DataServer, UserOp } = require("../data")
const { verifyValidParametersForLocation, getUsedParametersFromOptions, flattenObj, validateClassInstance } = require("../utils")
const { MissingParameterError, Helper } = require("../errors")
const { Bundler } = require("../data/Bundler")

const chainExpectedKeys = [["chainId", "chainName", "rpcUrl", "bundlerUrl"]]

class Chain {
    constructor(input) {
        const currentLocation = "Chain constructor"
        verifyValidParametersForLocation(currentLocation, input, chainExpectedKeys)
        const [key] = getUsedParametersFromOptions(input, chainExpectedKeys[0])

        this[key] = input[key]
        this.key = key
    }


    async init() {
        if (this.key == "chainId" || this.key == "chainName") {
            await this.loadChainData(this[this.key])
        }
        if (this.key == "rpcUrl") {
            this.provider = new JsonRpcProvider(this.rpcUrl)
            const { chainId } = await this.provider.getNetwork()
            await this.loadChainData(chainId)
        }
        // await this.loadBundler()
        await this.loadProvider()
    }

    async loadProvider() {
        if (!this.provider) {
            this.provider = new JsonRpcProvider(this.rpcUrl)
        }
    }

    async loadBundler() {
        if (this.bundler) {
            const bundlerChainId = await this.bundler.getChainId(this.bundlerUrl)
            if (bundlerChainId == this.chainId) {
                return
            }
        }
        this.bundler = new Bundler(this.bundlerUrl, this.addresses.entryPointAddress, this.id)
    }

    async loadChainData(chainId) {
        if (!this.id) {
            const chain = await DataServer.getChainInfo(chainId)
            this.id = chain.chain;
            this.name = chain.key;
            this.currency = chain.currency
            const addresses = { ...chain.aaData, ...flattenObj(chain.moduleAddresses) }
            Object.assign(this, { ...this, addresses, ...chain.rpcdata })
        }
    }

    async getData(key) {
        await this.init()
        return this[key]
    }

    async getAddresses() {
        await this.init()
        return this.addresses
    }

    async getAddress(name) {

        await this.init()

        const res = this.addresses[name]
        if (!res) {
            const currentLocation = "Chain.getAddress"
            const helperMainMessage = "Key doesn't exist"
            const helper = new Helper(`${currentLocation} was given these parameters`, name, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return res
    }

    async getChainId() {
        await this.init()
        return this.id
    }

    async getProvider() {
        await this.init()
        return this.provider
    }
    setAddress(name, address) {
        this.addresses[name] = address
    }

    async sendOpToBundler(userOp) {
        validateClassInstance(userOp, "userOp", UserOp, "Chain.sendOpToBundler")
        await this.init()
        return await this.bundler.sendUserOpToBundler(userOp.op)
    }
}


const main = async () => {
    const chainParams = {
        chainId: 31337
    }

    const chain = new Chain(chainParams)

    console.log(await chain.getAddress("entryPointAddress"))
}


module.exports = { Chain }