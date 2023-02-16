const { generateSha256, getPromiseFromOp, sendRequest } = require('./tools')
const ethers = require("ethers")

const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/dev'
const APIURL2 = "https://zl8bx9p7f4.execute-api.us-west-2.amazonaws.com/Prod"
// const APIURL = 'http://localhost:3000'
class DataServer {
    constructor(apiKey = "") {
        this.apiKey = apiKey
    }
    async init() {
        const ret = await this.getOrgInfo()
        this.id = ret.id
        this.name = ret.name
    }
    async getOrgInfo() {
        return await this.sendGetRequest(APIURL2, "apikey").then((r) => {
            return r.data
        })
    }

    async getStoredUserOp(userOpHash) {
        const body = { userOpHash }
        const op = await this.sendPostRequest(APIURL, "get-user-op", body).then((r) => {
            return r.data
        })

        Object.keys(op).map(key => {
            if (op[key].type == "BigNumber") {
                op[key] = ethers.BigNumber.from(op[key].hex)
            }
        })
        return op
    }

    async storeUserOp({op, type, balance = 0, receipt = {}}) {
        const userOp = await getPromiseFromOp(op)
        const userOpHash = generateSha256(userOp.signature.toString())
        const body = {
            userOpHash, userOp, type, balance, receipt,
            organization: this.id,
            orgName: this.name,
            
        }
        await this.sendPostRequest(APIURL, "save-user-op", body).then((r) => {
            // console.log(r)
            console.log(r.message + " type: " + type)
        })
        return userOpHash
    }

    async storeEVMCall(receipt) {
        const body = {
            receipt,
            txHash: receipt.transactionHash,
            organization: this.id,
            orgName: this.name
        }
        return await this.sendPostRequest(APIURL, "save-evm-receipt", body).then(r => {
            console.log(r.message + " type: evm_receipt")
            return r
        })
    }

    static async getTokenInfo(symbol) {
        const body = {
            symbol
        }
        return await this.sendPostRequest(APIURL, "get-erc-token", body).then(r => {
            return r.data
        })
    }

    async sendGetRequest(APIURL, endpoint) {
        return await sendRequest(`${APIURL}/${endpoint}`, "GET", this.apiKey)
    }

    async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", this.apiKey, body)
    }

    static async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", "", body)
    }

    static async getChainInfo(chain) {
        const body = { chain }
        return await this.sendPostRequest(APIURL, "get-chain-info", body).then((r) => {
            return r.data
        })
    }
}


module.exports = { DataServer }
