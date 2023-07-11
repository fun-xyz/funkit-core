import { Address, PublicClient, parseEther, toHex } from "viem"
import { Auth } from "../auth"
import { FACTORY_CONTRACT_INTERFACE, WALLET_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { Chain, getChainFromData } from "../data"
import { FunWallet } from "../wallet"

const gasSpecificChain = { 137: 350_000_000_000 }

export const fundWallet = async (
    auth: Auth,
    wallet: FunWallet,
    value: number,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
) => {
    const chain = await getChainFromData(txOptions.chain)
    const to = await wallet.getAddress()
    let txData
    if ((gasSpecificChain as any)[chain.id!]) {
        txData = { to, data: "0x", value: parseEther(`${value}`), gasPrice: (gasSpecificChain as any)[chain.id!] }
    } else {
        txData = { to, data: "0x", value: parseEther(`${value}`) }
    }
    const receipt = await auth.sendTx({ ...txData, chain })
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
