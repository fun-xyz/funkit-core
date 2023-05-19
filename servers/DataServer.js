const { DataFormatError, Helper } = require('../errors')
const { FUN_TESTNET_CHAIN_ID } = require('../test/testUtils')
const { sendRequest } = require('../utils/network')
const { getPromiseFromOp } = require('../utils/userop')

const LOCAL_FORK_CHAIN_ID = 31337
const LOCAL_URL = "http://127.0.0.1:3000"
const LOCAL_FORK_CHAIN_KEY = "ethereum-localfork"
const APIURL = 'https://m2m3k0n2uf.execute-api.us-west-2.amazonaws.com/prod' // New staging api server
const TEST_API_KEY = "localtest"

const BASE_WRAP_TOKEN_ADDR = {
    "1": {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    "5": {
        weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
    },
    "137": {
        wmatic: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
    },
    "43113": {
        weth: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3"
    }
}

const localTokenAddrs = {
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
}


const transactionType = "FunWalletInteraction"
class DataServer {
    static async storeUserOp(op, balance = 0, receipt = {}) {
        if (!global.apiKey) {
            throw new DataFormatError("apiKey", "string", "configureEnvironment")
        }
        if (global.apiKey == TEST_API_KEY) {
            return
        }
        const userOp = await getPromiseFromOp(op)
        const body = {
            userOp,
            type: transactionType,
            balance,
            receipt,
            organization: global.orgInfo?.id,
            orgName: global.orgInfo?.name,
            chainId: global.chain?.id
        }
        await this.sendPostRequest(APIURL, "save-user-op", body).then((r) => {
        })
        return receipt.userOpHash
    }

    static async storeEVMCall(receipt) {
        if (!global.apiKey) {
            throw new DataFormatError("apiKey", "string", "configureEnvironment")
        }
        if (global.apiKey == TEST_API_KEY) {
            return
        }

        const body = {
            receipt,
            txHash: receipt.transactionHash,
            organization: global.orgInfo?.id,
            orgName: global.orgInfo?.name
        }
        return await this.sendPostRequest(APIURL, "save-evm-receipt", body).then(r => {
            return r
        })
    }

    static async getTokenInfo(symbol, chain) {
        symbol = symbol.toLowerCase()
        let body, tokenInfo;

        body = {
            symbol,
            chain
        }
        if (chain == LOCAL_FORK_CHAIN_ID || chain == FUN_TESTNET_CHAIN_ID) {
            const addr = localTokenAddrs[symbol]
            if (addr) {
                return addr
            }
            body = {
                symbol,
                chain: 1
            }
        }
        if ((symbol == "weth" || symbol == "wmatic") && BASE_WRAP_TOKEN_ADDR[chain]) {
            return BASE_WRAP_TOKEN_ADDR[chain][symbol]
        }

        tokenInfo = await this.sendPostRequest(APIURL, "get-erc-token", body).then(r => {
            return r.data
        })
        if (tokenInfo.contract_address) {
            return tokenInfo.contract_address
        }
        const helper = new Helper("token", symbol, "token symbol doesn't exist")
        throw new ServerMissingDataError("Token.getAddress", "DataServer", helper)
    }

    static async sendGetRequest(APIURL, endpoint, apiKey) {
        return await sendRequest(`${APIURL}/${endpoint}`, "GET", apiKey ? apiKey : global.apiKey)
    }

    static async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", global.apiKey, body)
    }

    static async getChainInfo(chainId) {
        chainId = chainId.toString();
        if (!Number(chainId)) {
            return await this.getChainFromName(chainId)
        }
        const body = { chain: chainId }

        if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
            let req = await this.sendPostRequest(LOCAL_URL, "get-chain-info", body).then((r) => {
                return r
            }).catch(() => (undefined))
            const r = req ? req : {
                chain: chainId,
                rpcUrl: "http://localhost:8545"
            }
            const defaultAddresses = require("../test/forkDefaults").defaultAddresses
            r.moduleAddresses = { ...r.moduleAddresses, defaultAddresses }
            return r

        } else {
            return await this.sendPostRequest(APIURL, "get-chain-info", body).then((r) => {
                if (!r.data) {
                    throw new Error(JSON.stringify(r))
                }
                return r.data
            })
        }
    }

    static async getChainFromName(name) {
        if (name == LOCAL_FORK_CHAIN_KEY) {
            return await this.sendPostRequest(LOCAL_URL, "get-chain-info", { chain: name }).then((r) => {
                return r
            })
        } else {
            return await this.sendPostRequest(APIURL, "get-chain-from-name", { name }).then((r) => {
                return r.data
            })
        }
    }

    static async getModuleInfo(moduleName, chainId) {
        const body = {
            module: moduleName,
            chain: chainId.toString()
        }

        if (chainId != LOCAL_FORK_CHAIN_ID) {
            return await this.sendPostRequest(APIURL, "get-module-info", body).then((r) => {
                return r.data
            })
        } else {
            return await this.sendPostRequest(LOCAL_URL, "get-module-info", body).then((r) => {
                return r
            })
        }
    }

    static async getPaymasterAddress(chainId) {
        const { moduleAddresses: { paymaster: { paymasterAddress } } } = await this.getChainInfo(chainId)
        return paymasterAddress
    }

    static async sendUserOpToBundler(body, chainId, provider) {
        if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
            return await provider.send('eth_sendUserOperation', [body.userOp, body.entryPointAddress]);
        } else {
            return await this.sendPostRequest(APIURL, "bundler/send-user-op", body)
        }
    }

    static async estimateUserOpGas(body, chainId, provider) {
        if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
            return await provider.send('eth_estimateUserOperationGas', [body.userOp, body.entryPointAddress]);
        } else {
            return await this.sendPostRequest(APIURL, "bundler/estimate-user-op-gas", body)
        }
    }

    static async validateChainId(chainId, provider) {
        if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
            const chain = await provider.send('eth_chainId', [])
            return chain
        } else {
            return await this.sendPostRequest(APIURL, "bundler/validate-chain-id", { chainId })
        }
    }

    static async getChainId(bundlerUrl, chainId, provider) {
        if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
            const chain = await provider.send('eth_chainId', []);
            return parseInt(chain);
        } else {
            const response = await this.sendGetRequest(APIURL, `bundler/get-chain-id?bundlerUrl=${encodeURIComponent(bundlerUrl)}`)
            return response.chainId;
        }

    }

    static async setAuth(authId, method, addr, uniqueId) {
        return await this.sendPostRequest(APIURL, "auth/set-auth", {
            authId,
            method,
            addr,
            uniqueId
        })
    }

    static async getAuth(authId) {
        return await this.sendPostRequest(APIURL, "auth/get-auth", {
            authId
        })
    }

    /**
     * Get all tokens for a specific chain
     * @param {string} chainId https://chainlist.org/
     * @param {string} address 
     * @param {string} onlyVerifiedTokens If true, only return alchemy tokens that are verified(filters spam)
     * @returns JSON
     * {
     *    "0xTokenAddress": {
     *        "tokenBalance": "0x00001",
     *        "symbol": "USDC",
     *        "decimals": 6,
     *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
     *        "price": 1.0001,
     *     }
     * }
     */
    static async getTokens(chainId, holderAddr, onlyVerifiedTokens) {
        return await this.sendPostRequest(APIURL, "getAssets/get-tokens", {
            chain: chainId,
            address: holderAddr,
            onlyVerifiedTokens: onlyVerifiedTokens
        })
    }

    /**
     * Calls the fun api server to get all the NFTs owned by the holder
     * @param {string} chainId From https://chainlist.org/
     * @param {string} holderAddr Address of holder
     * @returns array
     *  [
     *     {
     *       "address": "string",
     *       "token_id": "string",
     *       "floor_price": "string",
     *     }
     *  ]
     */
    static async getNFTs(chainId, holderAddr) {
        return await this.sendPostRequest(APIURL, "getAssets/get-nfts", {
            chain: chainId,
            address: holderAddr
        })
    }

    /**
    * Calls the fun api server to get all the NFTs owned by the holder
    * @param {string} chainId From https://chainlist.org/
    * @param {string} holderAddr Address of holder
    * @returns array
    *  {
    *     "1" : [{
    *       "address": "string",
    *       "token_id": "string",
    *       "floor_price": "string",
    *     }],
    *  }
    */
    static async getAllNFTs(holderAddr) {
        return await this.sendPostRequest(APIURL, "getAssets/get-all-nfts", {
            address: holderAddr
        })
    }

    /**
     * Get all tokens for a specific chain
     * @param {string} chainId https://chainlist.org/
     * @param {string} address 
     * @param {string} onlyVerifiedTokens If true, only return alchemy tokens that are verified(filters spam)
     * @returns JSON
     * {
     *    1: {
     *      "0xTokenAddress": {
     *        "tokenBalance": "0x00001",
     *        "symbol": "USDC",
     *        "decimals": 6,
     *        "logo": "https://static.alchemyapi.io/images/assets/3408.png",
     *        "price": 1.0001,
     *     }
     *   }
     * }
     */
    static async getAllTokens(holderAddr, onlyVerifiedTokens) {
        return await this.sendPostRequest(APIURL, "getAssets/get-all-tokens", {
            address: holderAddr,
            onlyVerifiedTokens: onlyVerifiedTokens
        })
    }

    static async savePaymasterTransaction(transaction) {
        const type = paymasterType()
        if(type == 'base') throw new Error("No paymaster in use.")
        return await this.sendPostRequest(APIURL, "paymasters/add-sponsor-tx", {
            chain: global.chain?.id,
            sponsorAddress: global.gasSponsor?.sponsorAddress,
            type,
            tx: transaction
        })
    }

    static async updatePaymasterMode(mode) {
        const type = paymasterType()
        if(type == 'base') throw new Error("No paymaster in use.")
        return await this.sendPostRequest(APIURL, "paymasters/update-paymasters", {
            chain: global.chain?.id,
            sponsorAddress: global.gasSponsor?.sponsorAddress,
            type,
            updateObj: {
                mode
            }
        })
    }

    static async removeFromList(address, list) {
        const type = paymasterType()
        if(type == 'base') throw new Error("No paymaster in use.")
        return await this.sendPostRequest(APIURL, "paymasters/add-to-list", {
            chain: global.chain?.id,
            sponsorAddress: global.gasSponsor?.sponsorAddress,
            type,
            listType: list,
            updateAddr: address
        })
    }
    static async addToList(address, list) {
        const type = paymasterType()
        if(type == 'base') throw new Error("No paymaster in use.")
        return await this.sendPostRequest(APIURL, "paymasters/remove-from-list", {
            chain: global.chain?.id,
            sponsorAddress: global.gasSponsor?.sponsorAddress,
            type,
            listType: list,
            updateAddr: address
        })
    }

    static async whiteListToken() {
        return await this.sendPostRequest(APIURL, "paymasters/update-paymasters", {

        })
    }
}
const paymasterType = () => {
    if (global.gasSponsor?.sponsorAddress && global.gasSponsor?.token) {
        return 'token'
    }
    else if(global.gasSponsor?.sponsorAddress){
        return 'gasless'
    }
    else{
        return 'base'
    }
}

module.exports = { DataServer }
