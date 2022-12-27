"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const utils_1 = require("ethers/lib/utils");
const calcPreVerificationGas_1 = require("../src/calcPreVerificationGas");
describe('#calcPreVerificationGas', () => {
    const userOp = {
        sender: '0x'.padEnd(42, '1'),
        nonce: 0,
        initCode: '0x3333',
        callData: '0x4444',
        callGasLimit: 5,
        verificationGasLimit: 6,
        maxFeePerGas: 8,
        maxPriorityFeePerGas: 9,
        paymasterAndData: '0xaaaaaa'
    };
    it('returns a gas value proportional to sigSize', async () => {
        const pvg1 = (0, calcPreVerificationGas_1.calcPreVerificationGas)(userOp, { sigSize: 0 });
        const pvg2 = (0, calcPreVerificationGas_1.calcPreVerificationGas)(userOp, { sigSize: 65 });
        (0, chai_1.expect)(pvg2).to.be.greaterThan(pvg1);
    });
    it('returns a gas value that ignores sigSize if userOp already signed', async () => {
        const userOpWithSig = Object.assign(Object.assign({}, userOp), { signature: (0, utils_1.hexlify)(Buffer.alloc(65, 1)) });
        const pvg1 = (0, calcPreVerificationGas_1.calcPreVerificationGas)(userOpWithSig, { sigSize: 0 });
        const pvg2 = (0, calcPreVerificationGas_1.calcPreVerificationGas)(userOpWithSig);
        (0, chai_1.expect)(pvg2).to.equal(pvg1);
    });
});
//# sourceMappingURL=4-calcPreVerificationGas.test.js.map