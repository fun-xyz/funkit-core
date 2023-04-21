const { parseEther } = require("ethers/lib/utils")
const { Token } = require("../data")
const { Interface } = require("ethers/lib/utils")
const approveAndExecAbi = require("../abis/ApproveAndExec.json").abi
const approveAndSwapInterface = new Interface(approveAndExecAbi)


const approveAndExec = ({ approve, exec }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const appproveAndExecAddress = "0x6654dCEf5F156EbFC7F7d115a9952083Fd650697"

        const dest = exec.to
        const value = exec.value
        const executeData = exec.data
        const token = approve.to
        const approveData = approve.data
        const calldata = approveAndSwapInterface.encodeFunctionData("execute", [dest, value, executeData, token, approveData])
        const tx = { to: appproveAndExecAddress, data: calldata }
        return { data: tx, errorData }
    }
}

module.exports = { approveAndExec };
