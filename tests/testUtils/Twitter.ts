import { expect } from "chai"
import { Hex, encodeAbiParameters, encodeFunctionData, keccak256, parseAbiParameters, stringToHex } from "viem"
import { commitTransactionParams } from "../../src/actions/Twitter"
import { CommitParams } from "../../src/actions/types"
import { Auth } from "../../src/auth"
import { WALLET_ABI, WALLET_INIT_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain } from "../../src/data"
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
        const seed = stringToHex("thisisaverysecureseed")
        const socialHandle = stringToHex("paradigmeng420")

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
            const chain = new Chain({ chainId: params.chainId.toString() })
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

        it("Post the tweet", async () => {
            console.log("hi")
        })

        it("Verify the account was created and send a transaction", async () => {
            console.log("hi")
        })
    })
}
