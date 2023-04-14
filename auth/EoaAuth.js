const { arrayify } = require("ethers/lib/utils");
const { getUsedParametersFromOptions, verifyFunctionParameters, verifyPrivateKey } = require("../utils/data")
const { getSignerFromPrivateKey, getSignerFromProvider } = require("../utils/auth")
const { Auth } = require("./Auth");

const eoaAuthConstructorExpectedKeys = [["privateKey", "signer", "provider"]]

class Eoa extends Auth {
    signer = false

    constructor(input) {
        super()

        const currentLocation = "EoaAuth constructor"
        verifyFunctionParameters(currentLocation, input, eoaAuthConstructorExpectedKeys)
        const [key] = getUsedParametersFromOptions(input, eoaAuthConstructorExpectedKeys[0])
        switch (key) {
            case "privateKey":
                verifyPrivateKey(input[key], currentLocation)
                break;
            case "signer":
                // validateClassInstance(input[key], key, Signer, currentLocation)
                break;
            case "provider":
                // validateClassInstance(input[key], key, providers.Provider, currentLocation)
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
        const sig = await this.signer.signMessage(arrayify(hash))
        return sig
    }

    async getSigner() {
        await this.init()
        return this.signer
    }

    async sendTx(txData, options = global) {
        await this.init()
        if (typeof txData == "function") {
            txData = await txData(options)
        }
        const { to, value, data, chain } = txData
        const provider = await chain.getProvider()
        let eoa= this.signer;
        if (!eoa.provider) {
            eoa = this.signer.connect(provider)
        }
        const tx = await eoa.sendTransaction({ to, value, data })
        return await tx.wait()
    }

    async sendTxs(txs, options = global) {
        const receipts = []
        for (let tx of txs) {
            receipts.push(await this.sendTx(tx, options))
        }
        return receipts
    }

    async getUniqueId() {
        await this.init()
        return await this.signer.getAddress()
    }
}

module.exports = { Eoa };
