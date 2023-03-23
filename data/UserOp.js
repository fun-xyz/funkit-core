const { verifyValidParametersForLocation, } = require("../utils/data")
const { objectValuesToBigNumber } = require("../utils/data")
const { calcPreVerificationGas, getOpHash, } = require("../utils/userop")

const userOpExpectedKeys = ["sender", "callData", "nonce", "maxFeePerGas", "maxPriorityFeePerGas", "callGasLimit", "verificationGasLimit"]

class UserOp {

    opHashData = {}

    constructor(input) {
        verifyValidParametersForLocation("UserOp constructor", input, userOpExpectedKeys)
        input = objectValuesToBigNumber(input)
        let { initCode, paymasterAndData, preVerificationGas } = input
        initCode = initCode ? initCode : "0x"
        paymasterAndData = paymasterAndData ? paymasterAndData : "0x"
        this.op = { ...input, initCode, paymasterAndData, signature: '0x' }
        this.op.preVerificationGas = preVerificationGas ? preVerificationGas : calcPreVerificationGas(this.op)
    }

    async sign(auth, chain) {
        const opHash = await this.getOpHashData(chain)
        this.op.signature = await auth.signHash(opHash.hash)
    }

    async getOpHashData(chain) {
        const chainId = await chain.getChainId()
        const entryPointAddress = await chain.getAddress("entryPointAddress")

        const { chainId: prevChainId, entryPointAddress: prevEntryPointAddress } = this.opHashData

        if (chainId == prevChainId && entryPointAddress == prevEntryPointAddress) {
            return this.opHashData
        }

        const hash = getOpHash(this.op, chainId, entryPointAddress)
        this.opHashData = { chainId, entryPointAddress, hash }
        return this.opHashData
    }

    static async getNonce({ sender, callData }, timeout = 1000) {
        const now = Date.now()
        const time = now - now % timeout
        return BigNumber.from(keccak256(toUtf8Bytes(`${sender}${callData}${time}`)));
    }
}

module.exports = { UserOp };
