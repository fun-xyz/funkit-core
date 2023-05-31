import { BigNumber } from "ethers"
import { arrayify, defaultAbiCoder, hexlify, keccak256 } from "ethers/lib/utils"
import { sendRequest } from "./ApiUtils"
import { Chain, UserOperation } from "../data"

export const calcPreVerificationGas = (userOp: UserOperation) => {
    const ov = DefaultGasOverheads
    const p = Object.assign(
        {
            preVerificationGas: 28000,
            signature: hexlify(Buffer.alloc(ov.sigSize, 1))
        },
        userOp
    )
    const packed = arrayify(packUserOp(p, false))
    const callDataCost = packed.map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte)).reduce((sum, x) => sum + x)
    const ret = Math.round(callDataCost + ov.fixed / ov.bundleSize + ov.perUserOp + ov.perUserOpWord * packed.length)
    return BigNumber.from(ret)
}

function encode(typevalues: any, forSignature: any) {
    const types = typevalues.map((typevalue: any) => (typevalue.type === "bytes" && forSignature ? "bytes32" : typevalue.type))
    const values = typevalues.map((typevalue: any) =>
        typevalue.type === "bytes" && forSignature ? keccak256(typevalue.val) : typevalue.val
    )
    return defaultAbiCoder.encode(types, values)
}

function packUserOp(op: any, forSignature = true) {
    if (forSignature) {
        let encoded = defaultAbiCoder.encode([userOpTypeSig as any], [{ ...op, signature: "0x" }])
        encoded = "0x" + encoded.slice(66, encoded.length - 64)
        return encoded
    }
    const typevalues = UserOpType.components.map((c) => ({
        type: c.type,
        val: op[c.name]
    }))
    return encode(typevalues, forSignature)
}

export const getPromiseFromOp = async (op: UserOperation) => {
    const out: any = {}
    await Promise.all(
        Object.keys(op).map(async (key) => {
            out[key] = await (op as any)[key]
        })
    )
    return out
}

export async function gasCalculation(txid: string, chain: Chain) {
    try {
        const provider = await chain.getProvider()
        const txReceipt = await provider.getTransactionReceipt(txid)
        const gasUsed = txReceipt.gasUsed.toNumber()
        const gasPrice = txReceipt.effectiveGasPrice.toNumber() * 1e-18
        const gasTotal = gasUsed * gasPrice
        const chainPrice = await getPriceData(chain.currency!)
        const gasUSD = gasTotal * chainPrice.toNumber()
        return { gasUsed, gasUSD }
    } catch {
        return { gasUsed: 0, gasUSD: 0 }
    }
}

const PRICE_URL = "https://min-api.cryptocompare.com/data/price"

async function getPriceData(chainCurrency: string) {
    const data = await sendRequest(`${PRICE_URL}?fsym=${chainCurrency}&tsyms=USD`, "GET", "", {})
    const price = await data.json()
    return price.USD
}

// Constants

const DefaultGasOverheads = {
    fixed: 28000,
    perUserOp: 18300,
    perUserOpWord: 4,
    zeroByte: 4,
    nonZeroByte: 16,
    bundleSize: 1,
    sigSize: 65
}

const UserOpType = {
    components: [
        { internalType: "address", name: "sender", type: "address" },
        { internalType: "uint256", name: "nonce", type: "uint256" },
        { internalType: "bytes", name: "initCode", type: "bytes" },
        { internalType: "bytes", name: "callData", type: "bytes" },
        { internalType: "uint256", name: "callGasLimit", type: "uint256" },
        {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256"
        },
        {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256"
        },
        { internalType: "uint256", name: "maxFeePerGas", type: "uint256" },
        {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256"
        },
        { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
        { internalType: "bytes", name: "signature", type: "bytes" }
    ],
    internalType: "struct UserOperation",
    name: "userOp",
    type: "tuple"
}

const userOpTypeSig = {
    components: [
        {
            type: "address",
            name: "sender"
        },
        {
            type: "uint256",
            name: "nonce"
        },
        {
            type: "bytes",
            name: "initCode"
        },
        {
            type: "bytes",
            name: "callData"
        },
        {
            type: "uint256",
            name: "callGasLimit"
        },
        {
            type: "uint256",
            name: "verificationGasLimit"
        },
        {
            type: "uint256",
            name: "preVerificationGas"
        },
        {
            type: "uint256",
            name: "maxFeePerGas"
        },
        {
            type: "uint256",
            name: "maxPriorityFeePerGas"
        },
        {
            type: "bytes",
            name: "paymasterAndData"
        },
        {
            type: "bytes",
            name: "signature"
        }
    ],
    name: "userOp",
    type: "tuple"
}
