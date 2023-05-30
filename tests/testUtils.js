require("dotenv").config()

const {
    LOCAL_FORK_CHAIN_ID,
    FUN_TESTNET_CHAIN_ID,
    FUN_TESTNET_CHAIN_KEY,
    LOCAL_FORK_CHAIN_KEY,
    FUN_TESTNET_RPC_URL,
    LOCAL_FORK_RPC_URL
} = require("../src/common/constants")

const { getApiKey } = require("./getApiKey")

async function getTestApiKey() {
    try {
        return await getApiKey()
    } catch (error) {
        console.error("Error retrieving API key:", error)
        return null
    }
}
// use env for pkeys
module.exports = {
    FUN_TESTNET_CHAIN_ID,
    LOCAL_FORK_CHAIN_ID,
    FUN_TESTNET_CHAIN_KEY,
    LOCAL_FORK_CHAIN_KEY,
    FUN_TESTNET_RPC_URL,
    LOCAL_FORK_RPC_URL,
    getTestApiKey,
    ...process.env
}
