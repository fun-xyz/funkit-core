const { Eoa } = require("./EoaAuth");

class Web3AuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.provider = input.provider
    }

    async getSigner() {
        this.signer = await this.provider.getSigner()
        return this.signer
    }

    async getUniqueId() {
        await this.getSigner()
        return await this.signer.getAddress()
    }

    async signHash(hash) {
        const address = await this.getUniqueId()
        return await this.provider.send("personal_sign",
            [hash, address],
        )
    }
}

module.exports = { Web3AuthEoa }