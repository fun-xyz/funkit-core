const { PrimitiveModule } = require("../PrimitiveModule")
const { Enum } = require('../../../utils/Enum')
const ethers = require('ethers')
const ABI = ethers.utils.defaultAbiCoder

const AuthTypeData = [
    "ECDSA"
]

const AuthType = new Enum(AuthTypeData)

class UserMetadata {
    constructor(role, authType, authMetadata) {
        if (!role || !authMetadata || !AuthTypeData[authType]) {
            throw Error("Role name, auth type, and auth metadata are needed to create an UserMetadata")
        }
        this.role = ethers.utils.formatBytes32String(role)
        this.authType = authType
        if (this.authType == AuthType.ECDSA) {
            this.authMetadata = ABI.encode(["address"], [authMetadata])
        } else {
            this.authMetadata = authMetadata
        }
    }
}

class UserManager extends PrimitiveModule {

    // modify user through userOp
    async createUserTx(userId, userMetadata) {
        if (!userId || !userMetadata || !(userMetadata instanceof UserMetadata)) {
            throw Error("User id and user metadata are needed to create an user")
        }

        const userIdBytes = ethers.utils.formatBytes32String(userId)
        const txData = await this.wallet.contracts[this.wallet.address].contract.populateTransaction.createUser(userIdBytes, userMetadata)
        return await this.createUserOpFromCallData(txData, 0, false, true)
    }

    async deleteUserTx(userId) {
        if (!userId) {
            throw Error("User id is needed to delete an user")
        }

        const userIdBytes = ethers.utils.formatBytes32String(userId)
        const txData = await this.wallet.contracts[this.wallet.address].contract.populateTransaction.deleteUser(userIdBytes)
        return await this.createUserOpFromCallData(txData, 0, false, true)
    }

    async updateUserTx(userId, userMetadata) {
        if (!userId || !userMetadata || !(userMetadata instanceof UserMetadata)) {
            throw Error("User id and user metadata are needed to update an user")
        }

        const userIdBytes = ethers.utils.formatBytes32String(userId)
        const txData = await this.wallet.contracts[this.wallet.address].contract.populateTransaction.updateUser(userIdBytes, userMetadata)
        return await this.createUserOpFromCallData(txData, 0, false, true)
    }

    // read user, not through userOp
    async getUser(userId) {
        if (!userId) {
            throw Error("User id is needed to get an user")
        }
        const userIdBytes = ethers.utils.formatBytes32String(userId)
        return await this.wallet.contracts[this.wallet.address].contract.getUser(userIdBytes)
    }
}

module.exports = { AuthType, UserMetadata, UserManager }