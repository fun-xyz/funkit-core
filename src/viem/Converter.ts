import { createWalletClient, custom, toBytes } from "viem"
// @ts-ignore
//eslint-disable-next-line
import { Chain, mainnet } from "viem/chains"

interface web3ProviderConversionInterface {
    provider: any
    viemChain?: Chain
}

interface web3SignerConversionInterface {
    signer: any
    viemChain?: Chain
}

export const convertProviderToClient = ({ provider, viemChain }: web3ProviderConversionInterface) => {
    const chain = viemChain ? viemChain : mainnet
    if (provider.request) {
        return createWalletClient({
            chain,
            transport: custom(provider)
        })
    }
    if (!provider.send) throw new Error("Provider isn't EIP 1193 compliant")
    return createWalletClient({
        chain,
        transport: custom({
            async request({ method, params }) {
                const response = await provider.send(method, params)
                return response
            }
        })
    })
}

export const convertSignerToClient = ({ signer, viemChain }: web3SignerConversionInterface) => {
    const chain = viemChain ? viemChain : mainnet
    if (signer.type === "local") {
        return createWalletClient({
            chain,
            transport: custom(signer)
        })
    }
    return createWalletClient({
        chain,
        transport: custom({
            async request({ method, params }) {
                if (method === "eth_requestAccounts") {
                    return [await signer.getAddress()]
                } else if (method === "personal_sign") {
                    return await signer.signMessage(toBytes(params[0]))
                }
            }
        })
    })
}
