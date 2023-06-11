import {
    API_URL,
    BASE_WRAP_TOKEN_ADDR,
    FORK_DEFAULT_ADDRESSES,
    FUN_TESTNET_CHAIN_ID,
    LOCAL_API_URL,
    LOCAL_FORK_CHAIN_ID,
    LOCAL_FORK_CHAIN_KEY,
    LOCAL_TOKEN_ADDRS
} from "../common/constants"
import { Helper, ServerMissingDataError } from "../errors"
import { sendPostRequest } from "../utils/ApiUtils"

export async function getTokenInfo(symbol: string, chainId: string): Promise<any> {
    symbol = symbol.toLowerCase()
    let body

    body = {
        symbol,
        chain: chainId
    }
    if (Number(chainId) === LOCAL_FORK_CHAIN_ID || Number(chainId) === FUN_TESTNET_CHAIN_ID) {
        const addr = (LOCAL_TOKEN_ADDRS as any)[symbol]
        if (addr) {
            return addr
        }
        body = {
            symbol,
            chain: "1"
        }
    }
    if ((symbol === "weth" || symbol === "wmatic") && (BASE_WRAP_TOKEN_ADDR as any)[chainId]) {
        return (BASE_WRAP_TOKEN_ADDR as any)[chainId][symbol]
    }
    const tokenInfo = await sendPostRequest(API_URL, "get-erc-token", body).then((r) => {
        return r.data
    })
    if (tokenInfo.contract_address) {
        return tokenInfo.contract_address
    }
    const helper = new Helper("token", symbol, "token symbol doesn't exist")
    throw new ServerMissingDataError("Token.getAddress", "DataServer", helper)
}

export async function getChainInfo(chainId: string): Promise<any> {
    if (!Number(chainId)) {
        return await getChainFromName(chainId)
    }
    const body = { chain: chainId }

    if (Number(chainId) === LOCAL_FORK_CHAIN_ID) {
        const req = await sendPostRequest(LOCAL_API_URL, "get-chain-info", body)
            .then((r) => {
                return r
            })
            .catch(() => undefined)
        const r = req ? req : { chain: chainId, rpcUrl: "http://localhost:8545" }
        r.moduleAddresses = { ...r.moduleAddresses, FORK_DEFAULT_ADDRESSES }
        return r
    } else {
        return await sendPostRequest(API_URL, "get-chain-info", body).then((r) => {
            if (!r.data) {
                throw new Error(JSON.stringify(r))
            }
            return r.data
        })
    }
}

export async function getChainFromName(name: string): Promise<any> {
    if (name === LOCAL_FORK_CHAIN_KEY) {
        return await sendPostRequest(LOCAL_API_URL, "get-chain-info", { chain: name }).then((r) => {
            return r
        })
    } else {
        return await sendPostRequest(API_URL, "get-chain-from-name", { name }).then((r) => {
            return r.data
        })
    }
}

export async function getModuleInfo(moduleName: string, chainId: string): Promise<any> {
    const body = {
        module: moduleName,
        chain: chainId
    }

    if (Number(chainId) !== LOCAL_FORK_CHAIN_ID) {
        return await sendPostRequest(API_URL, "get-module-info", body).then((r) => {
            return r.data
        })
    } else {
        return await sendPostRequest(LOCAL_API_URL, "get-module-info", body).then((r) => {
            return r
        })
    }
}

export async function getPaymasterAddress(chainId: string): Promise<any> {
    const {
        moduleAddresses: {
            paymaster: { paymasterAddress }
        }
    } = await getChainInfo(chainId)
    return paymasterAddress
}
