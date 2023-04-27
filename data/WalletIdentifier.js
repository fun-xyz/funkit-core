const { keccak256, toUtf8Bytes } = require("ethers/lib/utils")
const { verifyFunctionParams, validateDataType, getUsedParametersFromOptions } = require("../utils/data")

const walletIdentifierExpectedKeys = [["uniqueId", "uid"]]

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
            case "uniqueId":
                return this.getIdentifierFromuniqueId(forced)
        }
    }

    async loadIdentifierFromServer(forced = false) { }

    getIdentifierFromuniqueId(forced = false) {
        if (!this.identifier || forced) {
            this.identifier = keccak256(toUtf8Bytes(`${this.uniqueId}-${this.index}`))
        }
        return this.identifier
    }

    async getIdentifierFromUid(forced = false) {
        if (forced || !this.uniqueId) {
            await this.loadIdentifierFromServer()
            return this.getIdentifierFromuniqueId(true)
        }
        return this.getIdentifierFromuniqueId(forced)
    }

}

module.exports = { WalletIdentifier };
