const { Signer, providers } = require("ethers");
const { arrayify } = require("ethers/lib/utils");

const { getUsedParametersFromOptions, verifyValidParametersForLocation, verifyPrivateKey, validateClassInstance, } = require("../utils/data")
const { getSignerFromPrivateKey, getSignerFromProvider } = require("../utils/auth")

const { Auth } = require("./Auth");


const eoaAuthConstructorExpectedKeys = [["privateKey", "signer", "provider"]]


class Eoa extends Auth {
    signer = false

    constructor(input) {
        super()

        const currentLocation = "EoaAuth constructor"
        verifyValidParametersForLocation(currentLocation, input, eoaAuthConstructorExpectedKeys)
        const [key] = getUsedParametersFromOptions(input, eoaAuthConstructorExpectedKeys[0])
        switch (key) {
            case "privateKey":
                verifyPrivateKey(input[key], currentLocation)
                break;
            case "signer":
                validateClassInstance(input[key], key, Signer, currentLocation)
                break;
            case "provider":
                validateClassInstance(input[key], key, providers.Provider, currentLocation)
                break;
        }
        this[key] = input[key]
        this.key = key
    }

    async init() {
        if (this.signer) {
            return
        }
        switch (this.key) {
            case "privateKey":
                this.signer = getSignerFromPrivateKey(this.privateKey)
                break;
            case "provider":
                this.signer = await getSignerFromProvider(this.provider)
                break;
        }
    }

    async signHash(hash) {
        await this.init()
        return await this.signer.signMessage(arrayify(hash))
    }

    async getSigner() {
        await this.init()
        return this.signer
    }

    async sendTx(txData) {
        const { to, value, data, chain } = txData
        const provider = await chain.getProvider()
        const eoa = this.signer.connect(provider)
        const tx = await eoa.sendTransaction({ to, value, data })
        return await tx.wait()
    }

    async sendTxs(txs) {
        const receipts = []
        for (let tx of txs) {
            receipts.push(await this.sendTx(tx))
        }
        return receipts
    }

    async getUniqueId() {
        await this.init()
        return await this.signer.getAddress()
    }
}

module.exports = { Eoa };