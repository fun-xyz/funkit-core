const { resolveProperties } = require("ethers/lib/utils");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { deepHexlify, verifyFunctionParameters, validateClassInstance } = require("../utils/data");
const { Helper, NoServerConnectionError, ServerError, ParameterFormatError } = require("../errors");
const bundlerExpectedKeys = ["bundlerUrl", "entryPointAddress", "chainId"]

class Bundler {
    constructor(bundlerUrl, entryPointAddress, chainId) {
        const input = { bundlerUrl, entryPointAddress, chainId }
        verifyFunctionParameters("Bundler constructor", input, bundlerExpectedKeys)
        this.bundlerUrl = bundlerUrl;
        this.entryPointAddress = entryPointAddress;
        this.chainId = chainId;
        this.userOpJsonRpcProvider = new JsonRpcProvider(this.bundlerUrl);
    }
    async validateChainId() {
        let chain;

        try {
            chain = await this.userOpJsonRpcProvider.send('eth_chainId', []);
        } catch (e) {
            const helper = new Helper("Bundler Url", this.bundlerUrl, "Can not connect to bundler.")
            throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, this.key != "bundlerUrl")
        }

        if (parseInt(chain) != this.chainId && this.chainId != 1337) {
            const helper = new Helper("Chain Id: ", this.chainId, `Bundler ${this.bundlerUrl} is on chainId ${chain}, but provider is on chainId ${this.chainId}`)
            throw new ParameterFormatError("Chain.loadBundler", helper)
        }
    }

    async sendUserOpToBundler(userOp) {
        validateOp(userOp)
        await this.validateChainId();
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
        return await this.userOpJsonRpcProvider.send('eth_sendUserOperation', [hexifiedUserOp, this.entryPointAddress]);
    }

    async estimateUserOpGas(userOp) {
        await this.validateChainId();
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
        return await this.userOpJsonRpcProvider.send('eth_estimateUserOperationGas', [hexifiedUserOp, this.entryPointAddress]);
    }

    static async getChainId(bundlerUrl) {
        const provider = new JsonRpcProvider(bundlerUrl);
        const chain = await provider.send('eth_chainId', []);
        return parseInt(chain);
    }
}

const validateOp = (userOp) => {
    const { UserOp } = require("../data/UserOp")
    try{

        validateClassInstance(userOp, "userOp", UserOp, "Chain.sendOpToBundler")
    }catch{
        new UserOp(userOp)
    }
}

module.exports = { Bundler };
