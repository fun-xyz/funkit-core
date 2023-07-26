import { Address } from "viem"
import { API_URL, BASE_WRAP_TOKEN_ADDR } from "../common/constants"
import { Helper, ServerMissingDataError } from "../errors"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function getTokenInfo(symbol: string, chainId: string): Promise<Address> {
    symbol = symbol.toLowerCase()
    const body = {
        symbol,
        chain: chainId
    }

    if ((symbol === "weth" || symbol === "wmatic") && (BASE_WRAP_TOKEN_ADDR as any)[chainId]) {
        return (BASE_WRAP_TOKEN_ADDR as any)[chainId][symbol]
    }

    const tokenInfo = await sendGetRequest(API_URL, `asset/erc20/${body.chain}/${body.symbol}`)

    if (tokenInfo.address) {
        return tokenInfo.address
    }
    const helper = new Helper("token", symbol, "token symbol doesn't exist")
    throw new ServerMissingDataError("Token.getAddress", "DataServer", helper)
}

export async function getChainInfo(chainId: string): Promise<any> {
    if (!Number(chainId)) {
        return await getChainFromName(chainId)
    }

    return await sendGetRequest(API_URL, `chain-info/${chainId}`).then((r) => {
        if (!r) {
            throw new Error(JSON.stringify(r))
        }
        return r
    })
}

export async function getChainFromName(name: string): Promise<any> {
    return await sendGetRequest(API_URL, `chain-id?${name}`)
}

export async function getModuleInfo(moduleName: string, chainId: string): Promise<any> {
    const body = {
        module: moduleName,
        chain: chainId
    }

    return await sendPostRequest(API_URL, "get-module-info", body).then((r) => {
        return r.data
    })
}

export async function getPaymasterAddress(chainId: string): Promise<any> {
    const {
        moduleAddresses: {
            paymaster: { paymasterAddress }
        }
    } = await getChainInfo(chainId)

    return paymasterAddress
}
