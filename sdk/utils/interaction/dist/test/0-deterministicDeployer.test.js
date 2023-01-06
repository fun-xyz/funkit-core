"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const types_1 = require("@account-abstraction/utils/dist/src/types");
const hardhat_1 = require("hardhat");
const utils_1 = require("ethers/lib/utils");
const DeterministicDeployer_1 = require("../src/DeterministicDeployer");
const deployer = new DeterministicDeployer_1.DeterministicDeployer(hardhat_1.ethers.provider);
describe('#deterministicDeployer', () => {
    it('deploy deployer', async () => {
        (0, chai_1.expect)(await deployer.isDeployerDeployed()).to.equal(false);
        await deployer.deployDeployer();
        (0, chai_1.expect)(await deployer.isDeployerDeployed()).to.equal(true);
    });
    it('should ignore deploy again of deployer', async () => {
        await deployer.deployDeployer();
    });
    it('should deploy at given address', async () => {
        const ctr = (0, utils_1.hexValue)(new types_1.SampleRecipient__factory(hardhat_1.ethers.provider.getSigner()).getDeployTransaction().data);
        DeterministicDeployer_1.DeterministicDeployer.init(hardhat_1.ethers.provider);
        const addr = await DeterministicDeployer_1.DeterministicDeployer.getAddress(ctr);
        (0, chai_1.expect)(await deployer.isContractDeployed(addr)).to.equal(false);
        await DeterministicDeployer_1.DeterministicDeployer.deploy(ctr);
        (0, chai_1.expect)(await deployer.isContractDeployed(addr)).to.equal(true);
    });
});
//# sourceMappingURL=0-deterministicDeployer.test.js.map