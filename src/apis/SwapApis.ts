import { TransactionParams } from "../common"
import { API_URL } from "../common/constants"
import { sendGetRequest } from "../utils/ApiUtils"

export async function get1InchSwapTx(
    chainId: string,
    src: string,
    dst: string,
    amount: string,
    from: string,
    slippage: string,
    disableEstimate: string,
    allowPartialFill: string
): Promise<TransactionParams> {
    const params = new URLSearchParams({
        src,
        dst,
        amount,
        from,
        slippage,
        disableEstimate,
        allowPartialFill
    }).toString()
    const res = await sendGetRequest(API_URL, `swap/${chainId}/swap/?${params}`)
    return {
        to: res.tx.to,
        value: Number(res.tx.value),
        data: res.tx.data
    }
}

export async function get1InchAllowance(chainId: string, tokenAddress: string, walletAddress: string): Promise<Number> {
    const params = new URLSearchParams({
        tokenAddress,
        walletAddress
    }).toString()
    const res = await sendGetRequest(API_URL, `swap/${chainId}/approve/allowance/?${params}`)
    return Number(res["allowance"])
}

export async function get1InchApproveTx(chainId: string, tokenAddress: string, amount: string): Promise<TransactionParams> {
    const params = new URLSearchParams({
        tokenAddress,
        amount
    }).toString()
    const res = await sendGetRequest(API_URL, `swap/${chainId}/approve/transaction/?${params}`)
    console.log("res", res)
    return {
        to: res.to,
        value: Number(res.value),
        data: res.data
    }
}
