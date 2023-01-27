"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.erc4337Provider = void 0;
const contracts_1 = require("@account-abstraction/contracts");
const SimpleAccountAPI_1 = require("./TreasuryAPI");
const { HttpRpcClient, ERC4337EthersProvider } = require('@account-abstraction/sdk')
/**
 * wrap an existing provider to tunnel requests through Account Abstraction.
 * @param originalProvider the normal provider
 * @param config see ClientConfig for more info
 * @param originalSigner use this signer as the owner. of this wallet. By default, use the provider's signer
 */
async function erc4337Provider(originalProvider, config, originalSigner = originalProvider.getSigner(), factoryAddress) {
    const entryPoint = contracts_1.EntryPoint__factory.connect(config.entryPointAddress, originalProvider);
    // Initial SimpleAccount instance is not deployed and exists just for the interface

    const smartAccountAPI = new SimpleAccountAPI_1.TreasuryAPI({
        provider: originalProvider,
        entryPointAddress: entryPoint.address,
        owner: originalSigner,
        factoryAddress,
        paymasterAPI: config.paymasterAPI
    });
    const chainId = await originalProvider.getNetwork().then(net => net.chainId);
    const httpRpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, chainId);
    return await new ERC4337EthersProvider(chainId, config, originalSigner, originalProvider, httpRpcClient, entryPoint, smartAccountAPI).init();
}
exports.erc4337Provider = erc4337Provider;
//# sourceMappingURL=Provider.js.map