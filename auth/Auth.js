const { BigNumber, Contract } = require("ethers");
const { keccak256, toUtf8Bytes } = require("ethers/lib/utils");

const { parseOptions } = require("../utils/option");
const entrypointAbi = require("../abis/EntryPoint.json").abi;
class Auth {
    async signHash() { }
    async getUniqueId() { }
    async getNonce({ sender }, key = 0, options = global) {
        const parsedOptions = await parseOptions(options)
        const chain = parsedOptions.chain
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const provider = await chain.getProvider()
        const entrypointContract = new Contract(entryPointAddress, entrypointAbi, provider)
        return await entrypointContract.getNonce(sender, key)
    }

    async getOwnerAddr() { }
    async getEstimateGasSignature() { }
    async switchChain(chain) { }
}

module.exports = { Auth }
