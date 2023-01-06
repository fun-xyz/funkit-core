"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@account-abstraction/utils/dist/src/types");
const hardhat_1 = require("hardhat");
const src_1 = require("../src");
const contracts_1 = require("@account-abstraction/contracts");
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const withArgs_1 = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const provider = hardhat_1.ethers.provider;
const signer = provider.getSigner();
describe('ERC4337EthersSigner, Provider', function () {
    let recipient;
    let aaProvider;
    let entryPoint;
    before('init', async () => {
        const deployRecipient = await new types_1.SampleRecipient__factory(signer).deploy();
        entryPoint = await new contracts_1.EntryPoint__factory(signer).deploy();
        const config = {
            entryPointAddress: entryPoint.address,
            bundlerUrl: ''
        };
        const aasigner = ethers_1.Wallet.createRandom();
        aaProvider = await (0, src_1.wrapProvider)(provider, config, aasigner);
        const beneficiary = provider.getSigner().getAddress();
        // for testing: bypass sending through a bundler, and send directly to our entrypoint..
        aaProvider.httpRpcClient.sendUserOpToBundler = async (userOp) => {
            try {
                await entryPoint.handleOps([userOp], beneficiary);
            }
            catch (e) {
                // doesn't report error unless called with callStatic
                await entryPoint.callStatic.handleOps([userOp], beneficiary).catch((e) => {
                    // eslint-disable-next-line
                    const message = e.errorArgs != null ? `${e.errorName}(${e.errorArgs.join(',')})` : e.message;
                    throw new Error(message);
                });
            }
            return '';
        };
        recipient = deployRecipient.connect(aaProvider.getSigner());
    });
    it('should fail to send before funding', async () => {
        try {
            await recipient.something('hello', { gasLimit: 1e6 });
            throw new Error('should revert');
        }
        catch (e) {
            (0, chai_1.expect)(e.message).to.eq('FailedOp(0,0x0000000000000000000000000000000000000000,account didn\'t pay prefund)');
        }
    });
    it('should use ERC-4337 Signer and Provider to send the UserOperation to the bundler', async function () {
        const accountAddress = await aaProvider.getSigner().getAddress();
        await signer.sendTransaction({
            to: accountAddress,
            value: (0, utils_1.parseEther)('0.1')
        });
        const ret = await recipient.something('hello');
        await (0, chai_1.expect)(ret).to.emit(recipient, 'Sender')
            .withArgs(withArgs_1.anyValue, accountAddress, 'hello');
    });
    it('should revert if on-chain userOp execution reverts', async function () {
        // specifying gas, so that estimateGas won't revert..
        const ret = await recipient.reverting({ gasLimit: 10000 });
        try {
            await ret.wait();
            throw new Error('expected to revert');
        }
        catch (e) {
            (0, chai_1.expect)(e.message).to.match(/test revert/);
        }
    });
});
//# sourceMappingURL=3-ERC4337EthersSigner.test.js.map