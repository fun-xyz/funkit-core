// require('dotenv').config();

const FUN_TESTNET_CHAIN_ID = 36864
const LOCAL_FORK_CHAIN_ID = 31337
const FUN_TESTNET_CHAIN_KEY = "fun-testnet"
const LOCAL_FORK_CHAIN_KEY = "ethereum-localfork"
const FUN_TESTNET_RPC_URL = "http://34.221.214.161:3001"
const LOCAL_FORK_RPC_URL = "http://127.0.0.1:8545"

const { getApiKey } = require('./getApiKey');

async function getTestApiKey() {

  try {
    return await getApiKey();
  } catch (error) {
    console.error("Error retrieving API key:", error);
    return null;
  }

}
// use env for pkeys
module.exports = {
  FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_KEY, LOCAL_FORK_CHAIN_KEY, FUN_TESTNET_RPC_URL, LOCAL_FORK_RPC_URL,
  getTestApiKey, ...process.env
};
