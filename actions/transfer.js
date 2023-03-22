const { parseEther } = require("ethers/lib/utils")


const ethTransfer = (to, value) => {
    return () => {
        const data = { to, data: "0x", value: parseEther(`${value}`) }
        return { data }
    }
}

module.exports = { ethTransfer };