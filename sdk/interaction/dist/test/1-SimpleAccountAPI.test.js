"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@account-abstraction/contracts");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const chai_1 = require("chai");
const withArgs_1 = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const hardhat_1 = require("hardhat");
const src_1 = require("../src");
const types_1 = require("@account-abstraction/utils/dist/src/types");
const DeterministicDeployer_1 = require("../src/DeterministicDeployer");
const utils_2 = require("@account-abstraction/utils");
const provider = hardhat_1.ethers.provider;
const signer = provider.getSigner();
describe('SimpleAccountAPI', () => {
    let owner;
    let api;
    let entryPoint;
    let beneficiary;
    let recipient;
    let accountAddress;
    let accountDeployed = false;
    before('init', async () => {
        entryPoint = await new contracts_1.EntryPoint__factory(signer).deploy();
        beneficiary = await signer.getAddress();
        recipient = await new types_1.SampleRecipient__factory(signer).deploy();
        owner = ethers_1.Wallet.createRandom();
        const factoryAddress = await DeterministicDeployer_1.DeterministicDeployer.deploy(contracts_1.SimpleAccountDeployer__factory.bytecode);
        api = new src_1.SimpleAccountAPI({
            provider,
            entryPointAddress: entryPoint.address,
            owner,
            factoryAddress
        });
    });
    it('#getUserOpHash should match entryPoint.getUserOpHash', async function () {
        const userOp = {
            sender: '0x'.padEnd(42, '1'),
            nonce: 2,
            initCode: '0x3333',
            callData: '0x4444',
            callGasLimit: 5,
            verificationGasLimit: 6,
            preVerificationGas: 7,
            maxFeePerGas: 8,
            maxPriorityFeePerGas: 9,
            paymasterAndData: '0xaaaaaa',
            signature: '0xbbbb'
        };
        const hash = await api.getUserOpHash(userOp);
        const epHash = await entryPoint.getUserOpHash(userOp);
        (0, chai_1.expect)(hash).to.equal(epHash);
    });
    it('should deploy to counterfactual address', async () => {
        accountAddress = await api.getAccountAddress();
        (0, chai_1.expect)(await provider.getCode(accountAddress).then(code => code.length)).to.equal(2);
        await signer.sendTransaction({
            to: accountAddress,
            value: (0, utils_1.parseEther)('0.1')
        });
        const op = await api.createSignedUserOp({
            target: recipient.address,
            data: recipient.interface.encodeFunctionData('something', ['hello'])
        });
        await (0, chai_1.expect)(entryPoint.handleOps([op], beneficiary)).to.emit(recipient, 'Sender')
            .withArgs(withArgs_1.anyValue, accountAddress, 'hello');
        (0, chai_1.expect)(await provider.getCode(accountAddress).then(code => code.length)).to.greaterThan(1000);
        accountDeployed = true;
    });
    context('#rethrowError', () => {
        let userOp;
        before(async () => {
            userOp = await api.createUnsignedUserOp({
                target: hardhat_1.ethers.constants.AddressZero,
                data: '0x'
            });
            // expect FailedOp "invalid signature length"
            userOp.signature = '0x11';
        });
        it('should parse FailedOp error', async () => {
            await (0, chai_1.expect)(entryPoint.handleOps([userOp], beneficiary)
                .catch(utils_2.rethrowError))
                .to.revertedWith('FailedOp: ECDSA: invalid signature length');
        });
        it('should parse Error(message) error', async () => {
            await (0, chai_1.expect)(entryPoint.addStake(0)).to.revertedWith('must specify unstake delay');
        });
        it('should parse revert with no description', async () => {
            // use wrong signature for contract..
            const wrongContract = entryPoint.attach(recipient.address);
            await (0, chai_1.expect)(wrongContract.addStake(0)).to.revertedWithoutReason();
        });
    });
    it('should use account API after creation without a factory', async function () {
        if (!accountDeployed) {
            this.skip();
        }
        const api1 = new src_1.SimpleAccountAPI({
            provider,
            entryPointAddress: entryPoint.address,
            accountAddress,
            owner
        });
        const op1 = await api1.createSignedUserOp({
            target: recipient.address,
            data: recipient.interface.encodeFunctionData('something', ['world'])
        });
        await (0, chai_1.expect)(entryPoint.handleOps([op1], beneficiary)).to.emit(recipient, 'Sender')
            .withArgs(withArgs_1.anyValue, accountAddress, 'world');
    });
});
//# sourceMappingURL=1-SimpleAccountAPI.test.js.map