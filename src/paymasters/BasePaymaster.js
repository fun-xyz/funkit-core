/**
 * BasePaymaster is the class which all Paymasters extend.
 * Currently, it's mostly empty. Eventually it will be filled with helper methods
 * important to be inherited by all Paymasters.
 */
class BasePaymaster {
    /**
     * Returns paymaster information required by the EntryPoint smart contract.
     * 
     * @param userOp a partially-filled UserOperation (without signature and paymasterAndData
     *  note that the "preVerificationGas" is incomplete: it can't account for the
     *  paymasterAndData value, which will only be returned by this method..
     * 
     * @returns the value to put into the PaymasterAndData, undefined to leave it empty
     */
    async getPaymasterAndData(userOp) {
        return '0x';
    }
}

module.exports = { BasePaymaster }