const { v4: uuidv4 } = require('uuid');
const { Eoa } = require("./EoaAuth");
const { arrayify } = require("ethers/lib/utils");

class MultiAuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.ids = input.ids //["twitter###Chazzz", "google###chaz@fun.xyz", "0x111111111111111111"]
        this.provider = input.provider
        this.uniqueID = uuidv4()
    }

    // figure storage part

    async getUniqueId() {
        return this.uniqueID
    }

    async getSigner() {
        this.signer = await this.provider.getSigner()
        return this.signer
    }

    async getOwnerAddr() {
        const signer = await this.provider.getSigner()
        return await signer.getAddress()
    }

    async signHash(hash) {
        const signer = await this.getSigner()
        return await signer.signMessage(arrayify(hash))
    }
}

module.exports = { MultiAuthEoa }