const { constants, Signer, providers } = require("ethers");
const { arrayify } = require("ethers/lib/utils");
const { getUsedParametersFromOptions, verifyValidParametersForLocation, verifyPrivateKey, validateClassInstance, getSignerFromPrivateKey, getSignerFromProvider } = require("../utils");
const { Auth } = require("./Auth");


const eoaAuthConstructorExpectedKeys = [["privateKey", "signer", "provider"]]


class EoaAuth extends Auth {
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
    async getUniqueId() {
        await this.init()
        return await this.signer.getAddress()
    }
}

const authParams = {
    privateKey: "0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
}

const main = async () => {
    const auth = new EoaAuth(authParams)
    const opHash = "0x42050058edf1b723e8834e454f2ca82d0a4b08284c7fe0acf9c4376bb2a96acc"
    console.log(await auth.signHash(opHash), "\0xcd4d2a1f71c6890ebfac6f9d0fce757bcf0c40ec75102f3b43ec5164df8e8042344d57ee577bb5b0208df71aa9779b17fc63ae095232a974a7d247106522307e1b")
}

main()

module.exports = { EoaAuth };