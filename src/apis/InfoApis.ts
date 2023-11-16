import { Address } from "viem"
import { API_URL, BASE_WRAP_TOKEN_ADDR } from "../common/constants"
import { ErrorCode, ResourceNotFoundError } from "../errors"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function getTokenInfo(symbol: string, chainId: string, apiKey: string): Promise<any> {
    symbol = symbol.toLowerCase()
    const body = {
        symbol,
        chain: chainId
    }
    if (symbol === "weth" && chainId !== "137" && Object.keys(BASE_WRAP_TOKEN_ADDR).includes(chainId)) {
        return (BASE_WRAP_TOKEN_ADDR as any)[chainId][symbol]
    } else if (symbol === "wmatic" && chainId === "137") {
        return (BASE_WRAP_TOKEN_ADDR as any)[chainId][symbol]
    }

    const tokenInfo = await sendGetRequest(API_URL, `asset/erc20/${body.chain}/${body.symbol}`, apiKey)

    if (tokenInfo.address) {
        return tokenInfo.address
    }
    throw new ResourceNotFoundError(
        ErrorCode.TokenNotFound,
        "token symbol does not exist on provided chain",
        { symbol, chainId },
        "Provide correct symbol and chainId.",
        "https://docs.fun.xyz"
    )
}

export async function getChainFromId(chainId: string, apiKey: string): Promise<any> {
    return await sendGetRequest(API_URL, `chain-info/${chainId}`, apiKey).then((r) => {
        if (!r) {
            throw new Error(JSON.stringify(r))
        }
        return r
    })
}

export async function getChainFromName(name: string): Promise<any> {
    return await sendGetRequest(API_URL, `chain-info?name=${name}`).then((r) => {
        if (!r) {
            throw new Error(JSON.stringify(r))
        }
        return r
    })
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

export async function getPaymasterAddress(chainId: string, apiKey: string): Promise<Address> {
    const {
        moduleAddresses: {
            paymaster: { paymasterAddress }
        }
    } = await getChainFromId(chainId, apiKey)

    return paymasterAddress
}
