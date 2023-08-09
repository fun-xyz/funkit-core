import { createWalletClient, custom } from "viem"
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
    if (!signer.signMessage) throw new Error("Signer isn't EIP 1193 compliant")
    return createWalletClient({
        chain,
        transport: custom({
            async request({ method, params }) {
                console.log(method, params, signer)
                if (method === "eth_requestAccounts") {
                    return [signer.address]
                } else if (method === "signMessage") {
                    return await signer.signMessage(params.message)
                }
            }
        })
    })
}
