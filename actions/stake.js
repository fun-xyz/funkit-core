const { parseEther } = require("ethers/lib/utils")

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

const getLidoAddress = (chainId) => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return null
    }
}


module.exports = { _stake };