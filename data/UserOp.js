
const { verifyValidParametersForLocation, objectValuesToBigNumber, } = require("../utils/data")

const { calcPreVerificationGas, getOpHash, } = require("../utils/userop")

const userOpExpectedKeys = ["sender", "callData", "nonce", "maxFeePerGas", "maxPriorityFeePerGas", "callGasLimit", "verificationGasLimit"]

class UserOp {
    constructor(input) {
        verifyValidParametersForLocation("UserOp constructor", input, userOpExpectedKeys)
        input = objectValuesToBigNumber(input)
        let { initCode, paymasterAndData, preVerificationGas, signature } = input
        initCode = initCode ? initCode : "0x"
        paymasterAndData = paymasterAndData ? paymasterAndData : "0x"
        signature = signature ? signature : "0x"
        this.op = { ...input, initCode, paymasterAndData, signature }
        this.op.preVerificationGas = preVerificationGas ? preVerificationGas : calcPreVerificationGas(this.op)
    }

    async sign(auth, chain) {
        const opHash = await this.getOpHashData(chain)
        this.op.signature = await auth.signHash(opHash)
    }

    async getOpHashData(chain) {
        const chainId = await chain.getActualChainId()
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const hash = getOpHash(this.op, chainId, entryPointAddress)
        return hash
    }
}

module.exports = { UserOp };
