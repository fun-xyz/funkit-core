const { keccak256, toUtf8Bytes } = require("ethers/lib/utils")
const { verifyFunctionParams, validateDataType, getUsedParametersFromOptions } = require("../utils/data")

const walletIdentifierExpectedKeys = [["uniqueID", "uid"]]

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
            case "uniqueID":
                return this.getIdentifierFromuniqueID(forced)
        }
    }

    async loadIdentifierFromServer(forced = false) { }

    getIdentifierFromuniqueID(forced = false) {
        if (!this.identifier || forced) {
            this.identifier = keccak256(toUtf8Bytes(`${this.uniqueID}-${this.index}`))
        }
        return this.identifier
    }

    async getIdentifierFromUid(forced = false) {
        if (forced || !this.uniqueID) {
            await this.loadIdentifierFromServer()
            return this.getIdentifierFromuniqueID(true)
        }
        return this.getIdentifierFromuniqueID(forced)
    }

}

module.exports = { WalletIdentifier };
