const { keccak256, toUtf8Bytes } = require("ethers/lib/utils")
const { verifyFunctionParams, validateDataType, getUsedParametersFromOptions } = require("../utils/data")

const walletIdentifierExpectedKeys = [["salt", "uid"]]

class WalletIdentifier {
    constructor(input) {
        const currentLocation = "WalletIdentifier constructor"
        verifyFunctionParams(currentLocation, input, walletIdentifierExpectedKeys)
        const [key] = getUsedParametersFromOptions(input, walletIdentifierExpectedKeys[0])

        if (input.index) {
            validateDataType(input.index, "index", (typeof 0), currentLocation)
            this.index = input.index
        } else {
            this.index = 0
        }

        this[key] = input[key]
        this.key = key
    }

    async getIdentifier(forced = false) {
        switch (this.key) {
            case "uid":
                return await this.getIdentifierFromUid(forced)
            case "salt":
                return this.getIdentifierFromSalt(forced)
        }
    }

    async loadIdentifierFromServer(forced = false) { }

    getIdentifierFromSalt(forced = false) {
        if (!this.identifier || forced) {
            this.identifier = keccak256(toUtf8Bytes(`${this.salt}-${this.index}`))
        }
        return this.identifier
    }

    async getIdentifierFromUid(forced = false) {
        if (forced || !this.salt) {
            await this.loadIdentifierFromServer()
            return this.getIdentifierFromSalt(true)
        }
        return this.getIdentifierFromSalt(forced)
    }

}

module.exports = { WalletIdentifier };
