const { BigNumber } = require("ethers");
const { keccak256, toUtf8Bytes } = require("ethers/lib/utils");

class Auth {
    async signHash() { }
    async getUniqueId() { }
    async getNonce({ sender, callData }, timeout = 1000) {
        const now = Date.now()
        const time = now - now % timeout
        return BigNumber.from(keccak256(toUtf8Bytes(`${sender}${callData}${time}`)));
    }
}



module.exports = { Auth }