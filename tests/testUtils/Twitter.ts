import { expect } from "chai"
import { Hex, encodeAbiParameters, encodeFunctionData, keccak256, parseAbiParameters, stringToHex } from "viem"
import { commitTransactionParams } from "../../src/actions/Twitter"
import { CommitParams } from "../../src/actions/types"
import { Auth } from "../../src/auth"
import { FACTORY_CONTRACT_INTERFACE, WALLET_ABI, WALLET_INIT_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, LoginData, Token } from "../../src/data"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface TwitterTestConfig {
    chainId: number
    numRetry?: number
}

export const TwitterTest = (config: TwitterTestConfig) => {
    describe("Twitter Account Creation Test", function () {
        this.timeout(300_000)
        let auth: Auth
        let initializerCallData: Hex
        let chain: Chain
        let wallet: FunWallet
        const seed = stringToHex("thisisaverysecureseed")
        const socialHandle = stringToHex("albertsuzhu")

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            chain = new Chain({ chainId: config.chainId.toString() })
            const validationInitData = encodeAbiParameters(parseAbiParameters("address[], bytes[]"), [
                [await chain.getAddress("rbacAddress")],
                [stringToHex("")]
            ])
            initializerCallData = encodeFunctionData({
                abi: WALLET_ABI,
                functionName: "initialize",
                args: [await chain.getAddress("twitterOracle"), validationInitData]
            })
        })

        it("Commit a secret", async () => {
            const params: CommitParams = {
                socialHandle: socialHandle,
                index: 1n,
                seed: seed,
                owner: await auth.getAddress(),
                initializerCallData: initializerCallData,
                chainId: config.chainId
            }
            const walletInitAddress = await chain.getAddress("walletInitAddress")
            const encodedCommitKey = encodeAbiParameters(parseAbiParameters("bytes, uint256, uint8"), [
                params.socialHandle,
                params.index,
                1
            ])
            const commitKey: Hex = keccak256(encodedCommitKey)
            const encodedHash = encodeAbiParameters(parseAbiParameters("bytes, address, bytes"), [
                params.seed,
                params.owner,
                params.initializerCallData
            ])
            const expectedHash: Hex = keccak256(encodedHash)
            const preExistingCommitHash = await WALLET_INIT_CONTRACT_INTERFACE.readFromChain(
                walletInitAddress,
                "commits",
                [commitKey],
                chain
            )
            const client = await chain.getClient()
            if (preExistingCommitHash[0] < (await client.getBlock()).timestamp) {
                await auth.sendTx(await commitTransactionParams(params))
            }

            const committedHash = await WALLET_INIT_CONTRACT_INTERFACE.readFromChain(walletInitAddress, "commits", [commitKey], chain)
            expect(committedHash[1]).to.equal(expectedHash)
        })

        it("Verify the account was created and send a transaction", async () => {
            // Create the wallet
            const loginData: LoginData = {
                loginType: 1,
                socialHandle: socialHandle,
                newFunWalletOwner: await auth.getAddress(),
                index: 0n
            }
            wallet = new FunWallet({ loginData: loginData })

            const loginDataBytes: Hex = encodeAbiParameters(
                [
                    {
                        components: [
                            { name: "loginType", type: "uint8" },
                            { name: "newFunWalletOwner", type: "address" },
                            { name: "salt", type: "bytes32" },
                            { name: "index", type: "uint256" },
                            { name: "socialHandle", type: "bytes" }
                        ],
                        name: "LoginData",
                        type: "tuple"
                    }
                ],
                [
                    {
                        loginType: loginData.loginType ?? 0,
                        newFunWalletOwner: loginData.newFunWalletOwner ?? (await auth.getAddress()),
                        salt: randomBytes(32),
                        index: BigInt(loginData.index!) ?? 0n,
                        socialHandle: loginData.socialHandle ?? socialHandle
                    }
                ]
            )
            // Make sure the wallet was correctly created with the correct address
            const expectedAddress = await FACTORY_CONTRACT_INTERFACE.readFromChain(
                await chain.getAddress("factoryAddress"),
                "getAddress",
                [loginDataBytes],
                chain
            )
            expect(await wallet.getAddress()).to.equal(expectedAddress)

            // Send a transaction and initialize the wallet
            await fundWallet(auth, wallet, 0.1)
            const eth = new Token("eth")
            const userOp = await wallet.transfer(auth, await auth.getAddress(), {
                to: await auth.getAddress(),
                amount: Number(await eth.getBalanceBN(await auth.getAddress()))
            })
            console.log(userOp)
            const authBalBefore = await eth.getBalanceBN(await auth.getAddress())
            await wallet.executeOperation(auth, userOp)
            const authBalAfter = await eth.getBalanceBN(await auth.getAddress())
            console.log(authBalAfter, authBalBefore)
        })
    })
}
