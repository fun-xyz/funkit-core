const { v4: uuidv4 } = require('uuid');
const { Eoa } = require("./EoaAuth");
const { arrayify } = require("ethers/lib/utils");
const { ParameterFormatError, Helper } = require("../errors");
const { getStoredUniqueId, setStoredUniqueId } = require("../utils");

class MultiAuthEoa extends Eoa {
    constructor(input) {
        super(input)
        this.authIds = input.authIds //[["twitter###Chazzz", "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"], ["google###chaz@fun.xyz", "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"], ["0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4", "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"]]
        this.provider = input.provider
    }

    async getUniqueId() {
        let uniqueIds = new Set()
        for (const authId of this.authIds) {
            const storedUniqueId = await getStoredUniqueId(authId[0])
            if (storedUniqueId) {
                uniqueIds.add(storedUniqueId)
            }
        }

        if (uniqueIds.size > 1) {
            const helper = new Helper("Invalid parameters", this.authIds, "authIds already link to multiple fun wallets")
            throw new ParameterFormatError("MultiAuthEoa.getUniqueId", helper)
        }
        
        if (uniqueIds.size == 1) {
            [ this.uniqueId ] = uniqueIds
        } else {
            this.uniqueId = uuidv4()
        }

        for (const authId of this.authIds) {
            await setStoredUniqueId(authId[0], this.uniqueId, authId[1])
        }

        return this.uniqueId
    }

    async getSigner() {
        this.signer = await this.provider.getSigner()
        return this.signer
    }

    async getOwnerAddr() {
        return this.authIds.map(authId => {
            return authId[1]
        })
    }

    async getEstimateGasSignature() {
        const ownerAddr = await this.getOwnerAddr()
        return ownerAddr[0]
    }

    async signHash(hash) {
        const signer = await this.getSigner()
        return await signer.signMessage(arrayify(hash))
    }
}

module.exports = { MultiAuthEoa }