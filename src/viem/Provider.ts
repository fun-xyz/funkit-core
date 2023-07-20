import { createWalletClient, custom } from "viem"
import { Chain, mainnet } from "viem/chains"

interface web3ProviderConversionInterface {
    provider: any
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
