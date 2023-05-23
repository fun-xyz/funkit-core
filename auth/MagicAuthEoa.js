const { Eoa } = require("./EoaAuth");
const { arrayify } = require("ethers/lib/utils");

class MagicAuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.provider = input.provider
        this.uniqueId = input.uniqueId
    }

    async getSigner() {
        this.signer = await this.provider.getSigner()
        return this.signer
    }

    async getUniqueId() {
        return this.uniqueId
    }

    async getOwnerAddr() {
        const signer = await this.getSigner()
        return [await signer.getAddress()]
    }

    async signHash(hash) {
        const signer = await this.getSigner()
        return await signer.signMessage(arrayify(hash))
    }
}

module.exports = { MagicAuthEoa }