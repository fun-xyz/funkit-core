const { resolveProperties } = require("ethers/lib/utils");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { deepHexlify, verifyValidParametersForLocation } = require("../utils/data");
const { Helper, NoServerConnectionError, ServerError, ParameterFormatError } = require("../errors");
const { DataServer } = require('./DataServer');

const bundlerExpectedKeys = ["bundlerUrl", "entryPointAddress", "chainId"]

class Bundler {
    constructor(bundlerUrl, entryPointAddress, chainId) {
        const input = { bundlerUrl, entryPointAddress, chainId }
        verifyValidParametersForLocation("Bundler constructor", input, bundlerExpectedKeys)
        this.bundlerUrl = bundlerUrl;
        this.entryPointAddress = entryPointAddress;
        this.chainId = chainId;
        this.userOpJsonRpcProvider = new JsonRpcProvider(this.bundlerUrl);
    }
    async validateChainId(chainId) {
        // validate chainId is in sync with expected chainid
        return await DataServer.validateChainId(chainId);
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

module.exports = { Bundler };
