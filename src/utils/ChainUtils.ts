import {
    Address,
    Hex,
    PublicClient,
    concat,
    decodeAbiParameters,
    encodeAbiParameters,
    isAddress as isAddressViem,
    keccak256,
    pad,
    parseEther,
    toBytes,
    toHex
} from "viem"
import { sendRequest } from "./ApiUtils"
import { sendAsset } from "../apis/FaucetApis"
import { Auth } from "../auth"
import { WALLET_CONTRACT_INTERFACE, gasSpecificChain } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"
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
    } catch (e) {
        return 0
    }
}

export const getPermitHash = (token: Address, to: Address, amount: bigint, nonce: bigint, walletAddr: Address, chainId: bigint) => {
    const salt = keccak256(toBytes("Create3Deployer.deployers()"))
    const EIP712_DOMAIN = keccak256(
        encodeAbiParameters(
            [{ type: "string" }],
            ["EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)"]
        )
    )
    const PERMIT_TYPEHASH = "PermitTransferStruct(address token, address to, uint256 amount, uint256 nonce)"
    const DOMAIN_SEPARATOR = keccak256(
        encodeAbiParameters(
            [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" }],
            [EIP712_DOMAIN, salt, keccak256(toBytes("1")), chainId, walletAddr, salt]
        )
    )
    const PERMIT_HASH = keccak256(
        encodeAbiParameters(
            [{ type: "string" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }],
            [PERMIT_TYPEHASH, token, to, amount, nonce]
        )
    )
    return keccak256(concat([DOMAIN_SEPARATOR, PERMIT_HASH]))
}

export const getGasStation = async (gasStationUrl: string): Promise<any> => {
    return await sendRequest(gasStationUrl, "GET", "")
}

export const useFaucet = async (chainIdentifier: Chain | number | string, wallet: FunWallet) => {
    const chain = await Chain.getChain({ chainIdentifier: chainIdentifier })
    const chainName = await chain.getChainName()
    if (chainName !== "goerli") {
        throw new InvalidParameterError(
            ErrorCode.InvalidChainIdentifier,
            "Only Goerli is supported",
            chainIdentifier,
            "Provide the goerli chain, 5, or goerli as the chain identifier",
            "https://docs.fun.xyz/"
        )
    }
    const walletAddress = await wallet.getAddress()
    const ethRequest = await sendAsset("eth", chainName, walletAddress)
    const usdcRequest = await sendAsset("usdc", chainName, walletAddress)
    const usdtRequest = await sendAsset("usdt", chainName, walletAddress)
    const daiRequest = await sendAsset("dai", chainName, walletAddress)
    return [ethRequest, usdcRequest, usdtRequest, daiRequest]
}
