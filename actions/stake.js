const LIDO_MATIC_ADDRESS = "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9"
const LIDO_ETH_ADDRESS = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"


const _stake = ({ amount }) => {
    return (actionData) => {
        const { wallet, chain, options } = actionData
        let data, errorData
        if (chain.id === 1) {
            data = { LIDO_ETH_ADDRESS, data: "0x", value: parseEther(`${amount}`) }
        } else if (chain.id === 137) {
            data = { LIDO_MATIC_ADDRESS, data: "0x", value: parseEther(`${amount}`) }
        }
        else {
            const reasonData = {
                title: "Possible reasons:",
                reasons: [
                    "Incorrect Chain Id",
                ],
            }
            errorData = {
                location: "action.transfer.eth",
                error: {
                    reasonData
                }
            }
        }
        return { data, errorData }
    }
}


module.exports = { _stake };