const { DataFormatError, Helper } = require('../errors')
const { FUN_TESTNET_CHAIN_ID } = require('../test/testUtils')
const { sendRequest } = require('../utils/network')
const { getPromiseFromOp } = require('../utils/userop')

const LOCAL_FORK_CHAIN_ID = 31337
const LOCAL_URL = "http://127.0.0.1:3000"
const LOCAL_FORK_CHAIN_KEY = "ethereum-localfork"
const APIURL = 'https://kjj7i5hi79.execute-api.us-west-2.amazonaws.com/prod'
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
    static async storeUserOp({ op, balance = 0, receipt = {} }) {
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
            receipt: receipt
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
            return await this.sendPostRequest(LOCAL_URL, "get-chain-info", body).then((r) => {
                const defaultAddresses = require("../test/forkDefaults").defaultAddresses
                r.moduleAddresses = { ...r.moduleAddresses, defaultAddresses }
                return r
            })
        } else {
            return await this.sendPostRequest(APIURL, "get-chain-info", body).then((r) => {
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

    static async setAuth(authId, method, addr, uniqueId){
        return await this.sendPostRequest(APIURL, "auth/set-auth", {
            authId,
            method,
            addr,
            uniqueId
        })
    }

    static async getAuth(authId){
        return await this.sendPostRequest(APIURL, "auth/get-auth", {
            authId
        })
    }


}

module.exports = { DataServer }