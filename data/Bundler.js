
const { resolveProperties } = require("ethers/lib/utils");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { deepHexlify, verifyValidParametersForLocation } = require("../utils/data");


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
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        const chain = await this.userOpJsonRpcProvider.send('eth_chainId', []);
        if (parseInt(chain) != this.chainId) {
            throw new Error(`bundler ${this.bundlerUrl} is on chainId ${chain}, but provider is on chainId ${this.chainId}`);
        }
    }

    async sendUserOpToBundler(userOp1) {
        await this.validateChainId();
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp1));
        const jsonRequestData = [hexifiedUserOp, this.entryPointAddress];
        // await this.printUserOperation('eth_sendUserOperation', jsonRequestData);
        return await this.userOpJsonRpcProvider
            .send('eth_sendUserOperation', [hexifiedUserOp, this.entryPointAddress]);
    }
    async estimateUserOpGas(userOp1) {
        await this.validateChainId();
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp1));
        const jsonRequestData = [hexifiedUserOp, this.entryPointAddress];
        await this.printUserOperation('eth_estimateUserOperationGas', jsonRequestData);
        return await this.userOpJsonRpcProvider.send('eth_estimateUserOperationGas', [hexifiedUserOp, this.entryPointAddress]);
    }

    static async getChainId(bundlerUrl) {
        const provider = new JsonRpcProvider(bundlerUrl);
        const chain = await provider.send('eth_chainId', []);
        return parseInt(chain);
    }
}

module.exports = { Bundler };