const { v4: uuidv4 } = require('uuid');
const { Eoa } = require("./EoaAuth");
const { arrayify } = require("ethers/lib/utils");
const { DataServer } = require("../servers/DataServer")

class MultiAuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.ids = input.ids //["twitter###Chazzz", "google###chaz@fun.xyz", "0x111111111111111111"]
        this.provider = input.provider
    }

    async getUniqueID() {
        let uniqueIDs = new Set()
        for (const id of this.ids) {
            const auth = await DataServer.getAuth(id)
            if (auth && auth.wallet) {
                uniqueIDs.add(auth.wallet)
            }
        }
        
        if (uniqueIDs.size >= 1) {
            this.uniqueID = uniqueIDs[0]
        } else {
            this.uniqueID = uuidv4()
        }

        for (const id of this.ids) {
            const words = id.split("###")
            let method
            if (words[0].startsWith("0x")) {
                method = "eoa"
            } else {
                method = words[0]
            }
            await DataServer.setAuth(id, method, this.uniqueID)
        }

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