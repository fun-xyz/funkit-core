const { generateSha256, getPromiseFromOp, sendRequest } = require('./Tools')
const ethers = require("ethers")

const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/dev'
class DataServer {
    constructor(orgId, apiKey = "") {
        this.orgId = orgId
        this.apiKey = apiKey
    }

    async getStoredUserOp(userOpHash) {
        const body = { userOpHash }
        const op = await this.sendPostRequest("get-user-op", body).then((r) => {
            return r.data
        })

        Object.keys(op).map(key => {
            if (op[key].type == "BigNumber") {
                op[key] = ethers.BigNumber.from(op[key].hex)
            }
        })
        return op
    }

    async storeUserOp(op, type, balance = 0) {
        const userOp = await getPromiseFromOp(op)
        const userOpHash = generateSha256(userOp.signature.toString())
        const body = {
            userOpHash, userOp, type, balance,
            user: this.orgId, //storing the customer name, should this be done somehow differently?
        }
        await this.sendPostRequest("save-user-op", body).then((r) => {
            console.log(r.message + " type: " + type)
        })
        return userOpHash
    }

    async storeEVMCall(receipt) {
        const body = {
            receipt,
            txHash: receipt.transactionHash,
            organization: this.orgId
        }
        return await this.sendPostRequest("save-evm-receipt", body).then(r => {
            console.log(r.message + " type: evm_receipt")
            return r
        })
    }

    static async getTokenInfo(symbol) {
        const body = {
            symbol
        }
        return await this.sendPostRequest("get-erc-token", body).then(r => {
            return r.data
        })
    }

    async sendPostRequest(endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", this.apiKey, body)
    }

    static async sendPostRequest(endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", "", body)
    }

    static async getChainInfo(chain) {
        const body = { chain }
        return await this.sendPostRequest("get-chain-info", body).then((r) => {
            return r.data
        })
    }
}


module.exports = { DataServer }
