const { resolveProperties } = require("ethers/lib/utils");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { deepHexlify, verifyValidParametersForLocation } = require("../utils/data");
const { Helper, NoServerConnectionError } = require("../errors");
const { DataServer } = require('./DataServer');
const bundlerExpectedKeys = ["bundlerUrl", "entryPointAddress", "chainId"]

class Bundler {
    constructor(bundlerUrl, entryPointAddress, chainId) {
        const input = { bundlerUrl, entryPointAddress, chainId }
        verifyFunctionParams("Bundler constructor", input, bundlerExpectedKeys)
        this.bundlerUrl = bundlerUrl;
        this.entryPointAddress = entryPointAddress;
        this.chainId = chainId;
    }
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        let response;
        try {
            response = await DataServer.validateChainId(this.chainId);
        } catch (e) {
            const helper = new Helper("Chain ID", this.chainId, "Cannot connect to bundler.");
            throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, this.key != "bundlerUrl");
        }
    }

    async sendUserOpToBundler(userOp1) {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp1));
        const body = {
            userOp: hexifiedUserOp,
            entryPointAddress: this.entryPointAddress,
            chainId: this.chainId
        };
        const response = await DataServer.sendUserOpToBundler(body);
        return response;
    }

    async estimateUserOpGas(userOp1) {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp1));
        const body = {
            userOp: hexifiedUserOp,
            entryPointAddress: this.entryPointAddress,
            chainId: this.chainId
        };
        const response = await DataServer.sendUserOpToBundler(body);
        return response;
    }

    static async getChainId(bundlerUrl) {
        return await DataServer.getChainId(bundlerUrl);
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
