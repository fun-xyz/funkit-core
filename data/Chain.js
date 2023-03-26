const { JsonRpcProvider } = require("@ethersproject/providers")
const { UserOp } = require("./UserOp")
const { MissingParameterError, Helper, ServerMissingDataError, NoServerConnectionError } = require("../errors")
const { DataServer, } = require("../servers/DataServer")
const { Bundler, } = require("../servers/Bundler")


const { verifyValidParametersForLocation, flattenObj, validateClassInstance, getUsedParametersFromOptions } = require("../utils/data")
const chainExpectedKeys = ["chainId", "chainName", "rpcUrl", "bundlerUrl"]

class Chain {
    constructor(input) {
        const currentLocation = "Chain constructor"
        verifyValidParametersForLocation(currentLocation, input, [chainExpectedKeys])
        const [key] = getUsedParametersFromOptions(input, chainExpectedKeys)
        this[key] = input[key]
        this.key = key
    }


    async init() {
        if (this.key == "chainId" || this.key == "chainName") {
            await this.loadChainData(this[this.key])
        }
        if (this.key == "rpcUrl") {
            await this.loadProvider()
            const { chainId } = await this.provider.getNetwork()
            await this.loadChainData(chainId)
        }
        if (this.key == "bundlerUrl") {
            const bundlerChainId = await Bundler.getChainId(this.bundlerUrl)
            await this.loadChainData(bundlerChainId)
            await this.loadBundler()
        }

        await this.loadBundler()
        await this.loadProvider()
    }

    async loadProvider() {
        if (!this.provider) {
            this.provider = new JsonRpcProvider(this.rpcUrl)
        }
    }

    async loadBundler() {
        if (!this.bundler) {
            try {
                this.bundler = new Bundler(this.bundlerUrl, this.addresses.entryPointAddress, this.id)
                await this.bundler.validateChainId()
            } catch (e) {
                const helper = new Helper("Bundler Url", this.bundlerUrl, "Can not connect to bundler.")
                throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, this.key != "bundlerUrl")
            }
        }
    }

    async loadChainData(chainId) {
        let chain;
        try {
            if (!this.id) {
                chain = await DataServer.getChainInfo(chainId)
                this.id = chain.chain;
                this.name = chain.key;
                this.currency = chain.currency
                const addresses = { ...chain.aaData, ...flattenObj(chain.moduleAddresses) }
                Object.assign(this, { ...this, addresses, ...chain.rpcdata })
            }
        } catch (e) {
            console.log(e)
            const helper = new Helper("getChainInfo", chain, "call failed")
            helper.pushMessage(`Chain identifier ${chainId} not found`)

            throw new ServerMissingDataError("Chain.loadChainData", "DataServer", helper)
        }
        // this.bundlerUrl = "http://localhost:3000/rpc"
    }

    async getData(key) {
        await this.init()
        return this[key]
    }

    async getAllAddresses() {
        await this.init()
        return this.addresses
    }

    async getAddress(name) {
        await this.init()
        const res = this.addresses[name]
        if (!res) {
            const currentLocation = "Chain.getAddress"
            const helperMainMessage = "Search key does not exist"
            const helper = new Helper(`${currentLocation} was given these parameters`, name, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return res
    }

    async getAddresses(names) {
        await this.init()
        let out = {}
        for (let name of names) {
            const res = this.addresses[name]
            if (!res) {
                const currentLocation = "Chain.getAddress"
                const helperMainMessage = "Search key does not exist"
                const helper = new Helper(`${currentLocation} was given these parameters`, name, helperMainMessage)
                throw new MissingParameterError(currentLocation, helper)
            }
            out[name] = res
        }
        return out
    }
    async getModuleAddresses(name) {
        await this.init()
        return await DataServer.getModuleInfo(name, this.id)
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
    async getFeeData() {
        await this.init()
        return await this.provider.getFeeData();
    }

    async estimateOpGas(partialOp) {
        await this.init()
        return await this.bundler.estimateUserOpGas(partialOp)
    }
}


const main = async () => {
    const chainParams = {
        rpcUrl: "http://localhost:8545"
    }
    const chain = new Chain(chainParams)
}

main()

module.exports = { Chain }


