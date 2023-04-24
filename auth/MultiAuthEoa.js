const { v4: uuidv4 } = require('uuid');
const { Eoa } = require("./EoaAuth");
const { arrayify } = require("ethers/lib/utils");
const { getStoredUniqueId, setStoredUniqueId } = require("../utils")

class MultiAuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.authIds = input.authIds //["twitter###Chazzz", "google###chaz@fun.xyz", "0x111111111111111111"]
        this.provider = input.provider
    }

    async getUniqueId() {
        let uniqueIds = new Set()
        for (const authId of this.authIds) {
            const storedUniqueId = await getStoredUniqueId(authId)
            if (storedUniqueId) {
                uniqueIds.add(storedUniqueId)
            }
        }
        
        if (uniqueIds.size >= 1) {
            [ this.uniqueId ] = uniqueIds
        } else {
            this.uniqueId = uuidv4()
        }

        for (const authId of this.authIds) {
            await setStoredUniqueId(authId, this.uniqueId)
        }

        return this.uniqueId
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