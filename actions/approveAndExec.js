const { parseEther } = require("ethers/lib/utils")
const { Token } = require("../data")
const { Interface } = require("ethers/lib/utils")
const approveAndExecAbi = require("../abis/ApproveAndExec.json").abi
const approveAndExecInterface = new Interface(approveAndExecAbi)
const { constants } = require("ethers")

const errorData = {
    location: "actions.approveAndExec"
}

const initData = approveAndExecInterface.encodeFunctionData("init", [constants.HashZero])

const approveAndExec = ({ approve, exec }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const appproveAndExecAddress = await chain.getAddress("approveAndExecAddress")
        // const appproveAndExecAddress = "0x72851f2406F7417616BA09Ba6034CD6BD4aE3221"
        const dest = exec.to
        const value = exec.value
        const executeData = exec.data
        const token = approve.to
        const approveData = approve.data
        const calldata = approveAndExecInterface.encodeFunctionData("approveAndExecute", [dest, value, executeData, token, approveData])
        const txData = { to: appproveAndExecAddress, data: [initData, calldata], initAndExec: true }
        return { data: txData, errorData }
    }
}

module.exports = { approveAndExec };
