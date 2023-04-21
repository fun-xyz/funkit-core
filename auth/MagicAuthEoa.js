const { Eoa } = require("./EoaAuth");
const { arrayify } = require("ethers/lib/utils");

class MagicAuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.provider = input.provider
        this.uniqueID = input.uniqueID
    }

    async getSigner() {
        this.signer = await this.provider.getSigner()
        return this.signer
    }

    getUniqueId() {
        return this.uniqueID
    }

    async getOwnerAddr() {
        const signer = await this.getSigner()
        return await signer.getAddress()
    }

    async signHash(hash) {
        const signer = await this.getSigner()
        return await signer.signMessage(arrayify(hash))
    }
}

module.exports = { MagicAuthEoa }