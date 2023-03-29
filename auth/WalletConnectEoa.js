const { Eoa } = require("./EoaAuth");


class WalletConnectEoa extends Eoa {
    constructor(input) {
        super(input)
        this.provider = input.provider
    }
    async signHash(hash) {
        const address = await this.getUniqueId()
        return await this.provider.send("personal_sign",
            [hash, address],
        )
    }
}

module.exports = { WalletConnectEoa }