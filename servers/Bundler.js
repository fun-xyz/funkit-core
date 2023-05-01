const { resolveProperties } = require("ethers/lib/utils");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { deepHexlify, verifyFunctionParams, validateClassInstance } = require("../utils/data");
const { Helper, NoServerConnectionError } = require("../errors");
const { DataServer } = require('./DataServer');
const bundlerExpectedKeys = ["bundlerUrl", "entryPointAddress", "chainId"]
const LOCAL_FORK_CHAIN_ID = 31337

class Bundler {
    constructor(bundlerUrl, entryPointAddress, chainId) {
        const input = { bundlerUrl, entryPointAddress, chainId }
        verifyFunctionParams("Bundler constructor", input, bundlerExpectedKeys)
        this.bundlerUrl = bundlerUrl;
        this.entryPointAddress = entryPointAddress;
        this.chainId = chainId;
        this.userOpJsonRpcProvider = Number(chainId) == LOCAL_FORK_CHAIN_ID ? 
            new JsonRpcProvider(this.bundlerUrl) : null;
    }
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        let response;
        try {
            response = await DataServer.validateChainId(this.chainId, this.userOpJsonRpcProvider);
        } catch (e) {
            const helper = new Helper("Chain ID", this.chainId, "Cannot connect to bundler.");
            throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, this.key != "bundlerUrl");
        }
    }

    async sendUserOpToBundler(userOp) {
        validateOp(userOp)
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
        const body = {
            userOp: hexifiedUserOp,
            entryPointAddress: this.entryPointAddress,
            chainId: this.chainId
        };
        const response = await DataServer.sendUserOpToBundler(body, this.chainId, this.userOpJsonRpcProvider);
        return response;
    }

    async estimateUserOpGas(userOp) {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
        const body = {
            userOp: hexifiedUserOp,
            entryPointAddress: this.entryPointAddress,
            chainId: this.chainId
        };
        const response = await DataServer.estimateUserOpGas(body, this.chainId, this.userOpJsonRpcProvider);
        return response;
    }

    static async getChainId(bundlerUrl) {
        return await DataServer.getChainId(bundlerUrl, this.chainId, this.userOpJsonRpcProvider);
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