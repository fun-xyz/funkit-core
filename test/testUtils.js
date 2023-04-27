const TEST_PRIVATE_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

const FUNDER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"


const WALLET_PRIVATE_KEY = "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064"
const GOERLI_FUNDER_PRIVATE_KEY = "0x01f3645a0c1b322e37fd6402253dd02c0b92e45b4dd072a9b6e76e4eb657345b"
const WALLET_PRIVATE_KEY_2 = "0x8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38"

const FUN_TESTNET_CHAIN_ID = 36864
const LOCAL_FORK_CHAIN_ID = 31337
const FUN_TESTNET_CHAIN_KEY = "fun-testnet"
const LOCAL_FORK_CHAIN_KEY = "ethereum-localfork"
const FUN_TESTNET_RPC_URL = "http://34.221.214.161:3001"
const LOCAL_FORK_RPC_URL = "http://127.0.0.1:8545"

const { getApiKey } = require('./getApiKey');

async function getTestApiKey() {
  if (!process.env.REMOTE_TEST) {
    return "localtest";
  } else {
    try {
      return await getApiKey();
    } catch (error) {
      console.error("Error retrieving API key:", error);
      return null;
    }
  }
}

module.exports = {
  TEST_PRIVATE_KEY, FUNDER_PRIVATE_KEY, WALLET_PRIVATE_KEY, FUN_TESTNET_CHAIN_ID, GOERLI_FUNDER_PRIVATE_KEY,
  LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_KEY, LOCAL_FORK_CHAIN_KEY, FUN_TESTNET_RPC_URL, LOCAL_FORK_RPC_URL, WALLET_PRIVATE_KEY_2,
  getTestApiKey
};