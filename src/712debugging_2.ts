import { ethers } from "ethers"
import { signUserOpWithEIP712 } from "./712sign"
import { userAuthAbi } from "./UserAuthAbi"

const GOERLI_URL = "https://late-dawn-mountain.ethereum-goerli.quiknode.pro/894425989f9db02f8da3cfb88b56ffa725f2d56f/"
const GOERLI_USER_AUTH_ADDR = "0x0f6ad358365d842f2a80f034f8be2ffdab91f0b4"
const GOERLI_ENTRYPOINT_ADDR = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"

const MY_SIGNER_KEY = "0x0268c5a895e5914857763381b7f9998a18259e5c97bf56a76e63b004814e9810"
const { abi } = userAuthAbi
const intf = new ethers.utils.Interface(abi)
const URL = GOERLI_URL
const USER_AUTH_ADDR = GOERLI_USER_AUTH_ADDR
const provider = new ethers.providers.JsonRpcProvider(URL)
const signer = new ethers.Wallet(MY_SIGNER_KEY, provider)

const contract = new ethers.Contract(USER_AUTH_ADDR, intf, provider)
const entryPointAddress = GOERLI_ENTRYPOINT_ADDR

const message = {
    sender: "0xC62503ED380F5B7acEe1413645d426f18A922D63",
    nonce: "0x1",
    initCode: "0x",
    callGasLimit: "0xf4240",
    verificationGasLimit: "0x989680",
    preVerificationGas: "0x30d40",
    maxFeePerGas: "1500000000",
    maxPriorityFeePerGas: "0x59682f00",
    paymasterAndData: "0x",
    entrypoint: entryPointAddress, //"0x1c39BA375faB6a9f6E0c01B9F49d488e101C2011",
    chainid: "0x5",
    callData: "0xabcd"
}

async function main() {
    const signature = await signUserOpWithEIP712(message, signer, contract)
    const userId = `0x000000000000000000000000${signer.address.slice(2)}`.toLowerCase()
    const encodedSignature = createEncodedSig({
        userid: userId,
        subSignature: signature
    })

    // const userOpHash = await entryPoint.getUserOpHash({ ...message, signature })

    const payload = {
        signature,
        userOpHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        userId,
        userOp: {
            sender: message.sender,
            nonce: message.nonce,
            initCode: message.initCode,
            callData: message.callData,
            callGasLimit: message.callGasLimit,
            verificationGasLimit: message.verificationGasLimit,
            preVerificationGas: message.preVerificationGas,
            maxFeePerGas: message.maxFeePerGas,
            maxPriorityFeePerGas: message.maxPriorityFeePerGas,
            paymasterAndData: message.paymasterAndData,
            signature: encodedSignature
            // entrypoint: message.entrypoint,
            // chainid: message.chainid
        }
    }

    const res = await contract.subValidateSignatureECDSAUserOp(payload.signature, payload.userOpHash, payload.userId, payload.userOp)
    console.log("Call succeeded.", res)
}

const extradataTupleType = "tuple(bytes32[],bytes32[],bytes32[],bytes32[])"

function createEncodedSig(data: any) {
    const authtype = data.authtype || 0
    const roleId = data.roleId || ethers.constants.HashZero
    const ruleId = data.ruleId || ethers.constants.HashZero
    const targetPath = data.targetPath || []
    const selectorPath = data.selectorPath || []
    const recipientPath = data.recipientPath || []
    const tokenPath = data.tokenPath || []
    return ethers.utils.defaultAbiCoder.encode(
        ["uint8", "bytes32", "bytes32", "bytes32", "bytes", extradataTupleType],
        [authtype, data.userid, roleId, ruleId, data.subSignature, [targetPath, selectorPath, recipientPath, tokenPath]]
    )
}

main().catch((err) => {
    console.error(err)
})
