import { Address, Hex, PublicClient, decodeAbiParameters, isAddress as isAddressViem, pad, parseEther, toHex } from "viem"
import { sendRequest } from "./ApiUtils"
import { Auth } from "../auth"
import { FACTORY_CONTRACT_INTERFACE, WALLET_CONTRACT_INTERFACE, gasSpecificChain } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { FunWallet } from "../wallet"

export const isAddress = (address: string): boolean => {
    try {
        const [decodedAddr] = decodeAbiParameters([{ type: "address" }], pad(address as Hex, { size: 32 }))
        return isAddressViem(decodedAddr as string)
    } catch (err) {
        return false
    }
}

export const fundWallet = async (
    auth: Auth,
    wallet: FunWallet,
    value: number,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
) => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const chainId = await chain.getChainId()
    const to = await wallet.getAddress()
    let txData
    if ((gasSpecificChain as any)[chainId]) {
        let maxPriorityFee, maxFee
        try {
            const {
                standard: { maxPriorityFee: maxPriorityFee1, maxFee: maxFee1 }
            } = await getGasStation(gasSpecificChain[chainId].gasStationUrl)
            maxPriorityFee = maxPriorityFee1
            maxFee = maxFee1
        } catch (e) {
            maxPriorityFee = BigInt(gasSpecificChain[chainId].backupPriorityFee)
            maxFee = BigInt(gasSpecificChain[chainId].backupFee)
        }

        txData = {
            to,
            data: "0x",
            value: parseEther(`${value}`),
            maxFeePerGas: BigInt(Math.floor(maxPriorityFee * 1e9)),
            maxPriorityFeePerGas: BigInt(Math.floor(maxFee * 1e9))
        }
    } else {
        txData = { to, data: "0x", value: parseEther(`${value}`) }
    }
    const receipt = await auth.sendTx({ ...txData })
    return await receipt
}

export const isContract = async (address: Address, client: PublicClient): Promise<boolean> => {
    try {
        const code = await client.getBytecode({ address })
        return !!code
    } catch (error) {
        return false
    }
}

export const randomBytes = (length: number) => {
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
    }

    return toHex(bytes)
}

export const getWalletPermitNonce = async (walletAddr: Address, chain: Chain, nonceKey = 0) => {
    try {
        return await WALLET_CONTRACT_INTERFACE.readFromChain(walletAddr, "getNonce", [nonceKey], chain)
    } catch {
        return 0
    }
}

export const getWalletPermitHash = async (
    factoryAddress: Address,
    chain: Chain,
    tokenAddress: Address,
    targetAddress: Address,
    amount: bigint,
    nonce: bigint
) => {
    const walletImpAddr = await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "funWalletImpAddress", [], chain)
    return await WALLET_CONTRACT_INTERFACE.readFromChain(
        walletImpAddr,
        "getPermitHash",
        [tokenAddress, targetAddress, amount, nonce],
        chain
    )
}

export const getGasStation = async (gasStationUrl: string): Promise<any> => {
    return await sendRequest(gasStationUrl, "GET", "")
}
