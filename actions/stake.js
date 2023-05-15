const { parseEther } = require("ethers/lib/utils")
const { approveAndExec } = require("./approveAndExec");

const _stake = ({ amount }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const lidoAddress = getLidoAddress(chain.id)
        let reasonData = null
        if (!lidoAddress) {
            reasonData = {
                title: "Possible reasons:",
                reasons: [
                    "Incorrect Chain Id",
                ],
            }
        }
        const data = { to: lidoAddress, data: "0x", value: parseEther(`${amount}`) }
        const errorData = {
            location: "action.stake",
            error: {
                reasonData
            }
        }
        return { data, errorData }
    }
}

const _stakeMatic = ({ amount }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const lidoAddress = "0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599"
        const data = { to: lidoAddress, data: "0x", value: parseEther(`${amount}`) }
        const errorData = {
            location: "action.stake",
        }
        const swapData = await actionContract.populateTransaction.executeSwapETH(to, amount, data)
        return await approveAndExec({ approve: data.approveTx, exec: data.swapTx })(actionData)

        return { data, errorData }
    }
}

const getLidoAddress = (chainId) => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        case 137:
            return "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9"
        default:
            return null
    }
}


module.exports = { _stake };