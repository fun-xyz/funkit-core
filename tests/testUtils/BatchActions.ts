import { assert, expect } from "chai"
import { Hex, concat, decodeAbiParameters, keccak256, pad } from "viem"
import { randInt } from "./utils"
import {
    addOwnerTxParams,
    createGroupTxParams,
    erc20ApproveTransactionParams,
    removeOwnerTxParams,
    uniswapV3SwapTransactionParams,
    updateGroupTxParams
} from "../../src/actions"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE, HashZero, WALLET_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { fundWallet, generateRandomGroupId, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface BatchActionsTestConfig {
    chainId: number
    outToken: string
    baseToken: string
    index?: number
    amount?: number
    prefundAmt: number
    numRetry?: number
}

export const BatchActionsTest = (config: BatchActionsTestConfig) => {
    const { outToken, prefundAmt, baseToken } = config

    describe("Single Auth BatchActions", function () {
        this.timeout(300_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811349)
            })
            chain = await Chain.getChain({ chainIdentifier: config.chainId })

            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }
        })

        it("Approve tokens", async () => {
            const randomAddresses = new Array(5).fill(randomBytes(20))
            const walletAddress = await wallet.getAddress()
            const approveAmount = randInt(10000)
            const outTokenAddress = await Token.getAddress(outToken)
            const txParams = await Promise.all(
                randomAddresses.map((randomAddress) => {
                    return erc20ApproveTransactionParams({
                        spender: randomAddress,
                        amount: approveAmount,
                        token: outTokenAddress
                    })
                })
            )
            const operation = await wallet.createBatchOperation(auth, await auth.getAddress(), txParams)
            await wallet.executeOperation(auth, operation)
            for (const randomAddr of randomAddresses) {
                const approvedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(
                    outTokenAddress,
                    "allowance",
                    [walletAddress, randomAddr],
                    chain
                )
                assert(
                    BigInt(approvedAmount) === BigInt(await new Token(outTokenAddress).getDecimalAmount(approveAmount)),
                    "BatchActions failed"
                )
            }
        })

        it("Incorrect Auth", async () => {
            const randAuth = new Auth({ privateKey: randomBytes(32) })
            const randomAddresses = new Array(5).fill(randomBytes(20))
            const approveAmount = randInt(10000)
            const outTokenAddress = await Token.getAddress(outToken)

            const txParams = await Promise.all(
                randomAddresses.map((randomAddress) => {
                    return erc20ApproveTransactionParams({
                        spender: randomAddress,
                        amount: approveAmount,
                        token: outTokenAddress
                    })
                })
            )
            try {
                const operation = await wallet.createBatchOperation(randAuth, await randAuth.getAddress(), txParams)
                await wallet.executeOperation(randAuth, operation)
                assert(false, "transaction passed")
            } catch (e: any) {
                assert(true)
            }
        })

        it("Swap, Approve", async () => {
            if (config.chainId !== 8453) {
                const randomAddress = randomBytes(20)
                const approveAmount = randInt(10000)
                const swapParams = await uniswapV3SwapTransactionParams({
                    tokenIn: config.baseToken,
                    tokenOut: outToken,
                    inAmount: 0.001,
                    recipient: randomAddress
                })
                const outTokenAddress = await Token.getAddress(outToken)
                const approveParams = await erc20ApproveTransactionParams({
                    spender: randomAddress,
                    amount: approveAmount,
                    token: outTokenAddress
                })
                const walletAddress = await wallet.getAddress()
                const operation = await wallet.createBatchOperation(auth, await auth.getAddress(), [swapParams, approveParams])
                console.log(await wallet.executeOperation(auth, operation))
                const approvedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(
                    outTokenAddress,
                    "allowance",
                    [walletAddress, randomAddress],
                    chain
                )
                assert(
                    BigInt(approvedAmount) === BigInt(await new Token(outTokenAddress).getDecimalAmount(approveAmount)),
                    "BatchActions failed"
                )
                const swappedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(outTokenAddress, "balanceOf", [randomAddress], chain)
                assert(BigInt(swappedAmount) > 0, "Swap unsuccesful")
            }
        })

        it("create group, add user to group", async () => {
            const groupId = generateRandomGroupId()
            const threshold = 2
            const memberIds: Hex[] = [
                pad(randomBytes(20), { size: 32 }),
                pad(randomBytes(20), { size: 32 }),
                pad(randomBytes(20), { size: 32 })
            ].sort((a, b) => b.localeCompare(a))
            const newUserId = randomBytes(20)

            const createGroupParams = await createGroupTxParams({
                groupId: groupId,
                group: {
                    userIds: memberIds,
                    threshold: threshold
                }
            })
            const addUserToGroupParams = await updateGroupTxParams({
                groupId: groupId,
                group: {
                    userIds: memberIds.concat([newUserId]),
                    threshold: threshold
                }
            })

            const operation = await wallet.createBatchOperation(auth, await auth.getAddress(), [createGroupParams, addUserToGroupParams])
            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            const userAuthContractAddr = await chain.getAddress("userAuthAddress")
            const groupKey = keccak256(concat([groupId, userAuthContractAddr]))

            const storedGroupData: Hex = await WALLET_CONTRACT_INTERFACE.readFromChain(
                await wallet.getAddress(),
                "getState",
                [groupKey],
                chain
            )
            const [storedGroup]: any[] = decodeAbiParameters(
                [
                    {
                        type: "tuple",
                        components: [{ type: "bytes32[]" }, { type: "uint256" }]
                    }
                ],
                storedGroupData
            )
            const currentMemberIds = memberIds.concat(pad(newUserId, { size: 32 })).sort((a, b) => b.localeCompare(a))
            expect(storedGroup[0]).to.be.deep.equal(currentMemberIds)
            expect(storedGroup[1]).to.be.equal(BigInt(threshold))
        })

        it("add owner, remove owner", async () => {
            const newOwnerId1 = randomBytes(20)
            const newOwnerId2 = randomBytes(20)
            const addOwner1Params = await addOwnerTxParams({
                ownerId: newOwnerId1
            })
            const addOwner2Params = await addOwnerTxParams({
                ownerId: newOwnerId2
            })
            const removeOwner1Params = await removeOwnerTxParams({
                ownerId: newOwnerId1
            })

            const operation = await wallet.createBatchOperation(auth, await auth.getAddress(), [
                addOwner1Params,
                addOwner2Params,
                removeOwner1Params
            ])
            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            const rbacContractAddr = await chain.getAddress("rbacAddress")
            const storedOwner1Rule = await WALLET_CONTRACT_INTERFACE.readFromChain(
                await wallet.getAddress(),
                "getState32WithAddr",
                [pad(newOwnerId1, { size: 32 }), rbacContractAddr],
                chain
            )

            expect(storedOwner1Rule === HashZero, "Owner rule not stored in wallet")

            const storedOwner2Rule = await WALLET_CONTRACT_INTERFACE.readFromChain(
                await wallet.getAddress(),
                "getState32WithAddr",
                [pad(newOwnerId2, { size: 32 }), rbacContractAddr],
                chain
            )

            expect(storedOwner2Rule !== HashZero, "Owner rule not stored in wallet")
        })
    })

    describe("MultiSig Auth BatchActions", function () {
        this.timeout(300_000)
        this.timeout(300_000)
        let auth1: Auth
        let auth2: Auth
        let wallet: FunWallet
        let chain: Chain
        const groupId: Hex = "0x2a9ac7208e6c38cb5fc71b3b0dedb4892c002bdd9757e2951604f77ebffc26ee" // generateRandomGroupId()

        before(async function () {
            this.retries(config.numRetry ? config.numRetry : 0)
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            await configureEnvironment(options)
            auth1 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            auth2 = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2") })
            wallet = new FunWallet({
                users: [
                    {
                        userId: groupId,
                        groupInfo: {
                            memberIds: [await auth1.getAddress(), await auth2.getAddress(), "0x38e97Eb79F727Fe9F64Ccb21779eefe6e1A783F4"],
                            threshold: 2
                        }
                    }
                ],
                uniqueId: await auth1.getWalletUniqueId(config.index ? config.index : 16611867)
            })
            chain = await Chain.getChain({ chainIdentifier: config.chainId })

            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            if (Number(await Token.getBalance(baseToken, await wallet.getAddress())) < prefundAmt) {
                await fundWallet(auth1, wallet, prefundAmt ? prefundAmt : 0.1)
            }
        })

        it("Approve tokens", async () => {
            const randomAddresses = new Array(5).fill(0).map(() => {
                return randomBytes(20)
            })

            const walletAddress = await wallet.getAddress()
            const approveAmount = randInt(10000)
            const outTokenAddress = await Token.getAddress(outToken)
            const txParams = await Promise.all(
                randomAddresses.map((randomAddress) => {
                    return erc20ApproveTransactionParams({
                        spender: randomAddress,
                        amount: approveAmount,
                        token: outTokenAddress
                    })
                })
            )
            const operation1 = await wallet.createBatchOperation(auth1, await groupId, txParams)

            const operation = await wallet.getOperation(operation1.opId!)
            await wallet.executeOperation(auth2, operation)
            await new Promise((r) => setTimeout(r, 4000))
            for (const randomAddr of randomAddresses) {
                const approvedAmount = await ERC20_CONTRACT_INTERFACE.readFromChain(
                    outTokenAddress,
                    "allowance",
                    [walletAddress, randomAddr],
                    chain
                )
                assert(
                    BigInt(approvedAmount) === BigInt(await new Token(outTokenAddress).getDecimalAmount(approveAmount)),
                    "BatchActions failed"
                )
            }
        })
    })
}
