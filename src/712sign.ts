import { ethers } from "ethers"
import { Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"

export const signUserOpWithEIP712 = async (userOp: any, signer: ethers.Wallet, userAuthentication: ethers.Contract): Promise<string> => {
    console.log(JSON.stringify(userOp, null, 2))
    // signTypedData
    const domain = {
        name: await userAuthentication.EIP712_NAME(),
        version: await userAuthentication.EIP712_VERSION(),
        chainId: Number(await userAuthentication.CHAIN_ID()),
        verifyingContract: userAuthentication.address as Hex
    }

    const UserOperationTypes: any = {
        UserOperation: [
            { name: "sender", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "initCode", type: "bytes" },
            { name: "callData", type: "bytes" },
            { name: "callGasLimit", type: "uint256" },
            { name: "verificationGasLimit", type: "uint256" },
            { name: "preVerificationGas", type: "uint256" },
            { name: "maxFeePerGas", type: "uint256" },
            { name: "maxPriorityFeePerGas", type: "uint256" },
            { name: "paymasterAndData", type: "bytes" },
            { name: "entrypoint", type: "address" },
            { name: "chainid", type: "uint256" }
        ]
    }

    const value = {
        sender: await userOp.sender,
        nonce: BigInt(String(await userOp.nonce)),
        initCode: await userOp.initCode,
        callData: await userOp.callData,
        callGasLimit: BigInt(String(userOp.callGasLimit)),
        verificationGasLimit: BigInt(String(userOp.verificationGasLimit)),
        preVerificationGas: BigInt(String(userOp.preVerificationGas)),
        maxFeePerGas: BigInt(String(userOp.maxFeePerGas)),
        maxPriorityFeePerGas: BigInt(String(userOp.maxPriorityFeePerGas)),
        paymasterAndData: await userOp.paymasterAndData,
        entrypoint: await userAuthentication.ENTRYPOINT(),
        chainid: BigInt(String(await userAuthentication.CHAIN_ID()))
    }

    const account = privateKeyToAccount(signer.privateKey as Hex)
    // console.log("===========================")
    // console.log(
    //     stringify(
    //         {
    //             domain,
    //             types: UserOperationTypes,
    //             primaryType: "UserOperation",
    //             message: value
    //         },
    //         2
    //     )
    // )
    console.log("===========================")
    const signature = await account.signTypedData({
        domain,
        types: UserOperationTypes,
        primaryType: "UserOperation",
        message: value
    })
    console.log(`\n=========================\nsignature: ${signature}\n==================\n`)
    // decode into v r s
    const { v, r, s } = ethers.utils.splitSignature(signature)
    // abi encode into signature
    return ethers.utils.defaultAbiCoder.encode(["uint8", "bytes32", "bytes32"], [v, r, s])
}
