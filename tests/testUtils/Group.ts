import { expect } from "chai"
import { Address, Hex, concat, decodeAbiParameters, keccak256, pad } from "viem"
import { Auth } from "../../src/auth"
import { WALLET_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain } from "../../src/data"
import { fundWallet, generateRandomGroupId, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface GroupTestConfig {
    chainId: number
    index?: number
    prefund?: boolean
    prefundAmt?: number
}

export const GroupTest = (config: GroupTestConfig) => {
    const { chainId, prefund, prefundAmt } = config
    describe("Group Op ", function () {
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        let userAuthContractAddr: Address
        let groupId: Hex
        let memberIds: Hex[] = []
        const threshold = 2
        const newUserId = randomBytes(20)
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 179701)
            })
            chain = await Chain.getChain({ chainIdentifier: chainId })
            memberIds = [
                pad(randomBytes(20), { size: 32 }),
                pad(randomBytes(20), { size: 32 }),
                pad(randomBytes(20), { size: 32 }),
                (await auth.getUserId()).toLowerCase() as Hex
            ].sort((a, b) => b.localeCompare(a))
            if (prefund) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            userAuthContractAddr = await chain.getAddress("userAuthAddress")
            groupId = generateRandomGroupId()
        })

        it("add group", async () => {
            const operation = await wallet.createGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                group: {
                    userIds: memberIds,
                    threshold: threshold
                },
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
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

            expect(storedGroup[0]).to.be.deep.equal(memberIds)
            expect(storedGroup[1]).to.be.equal(BigInt(threshold))
            const authUsers = await wallet.getUsers(auth)
            expect(authUsers.some((user) => user.userId === groupId)).to.be.true
        })

        it("add user to group", async () => {
            const operation = await wallet.addUserToGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                userId: newUserId,
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
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
            const authUsers = await wallet.getUsers(auth)
            const targetGroup = authUsers.find((user) => user.userId === groupId)
            expect(targetGroup?.groupInfo?.memberIds.includes(pad(newUserId, { size: 32 }))).to.be.true
        })

        it("remove user from group", async () => {
            const operation = await wallet.removeUserFromGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                userId: newUserId,
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
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

            expect(storedGroup[0]).to.be.deep.equal(memberIds)
            expect(storedGroup[1]).to.be.equal(BigInt(threshold))
            const authUsers = await wallet.getUsers(auth)
            const targetGroup = authUsers.find((user) => user.userId === groupId)
            expect(targetGroup?.groupInfo?.memberIds.includes(pad(newUserId, { size: 32 }))).to.be.false
        })

        it("update group threshold", async () => {
            const operation = await wallet.updateThresholdOfGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                threshold: 3,
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
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

            expect(storedGroup[0]).to.be.deep.equal(memberIds)
            expect(storedGroup[1]).to.be.equal(BigInt(3))
            const authUsers = await wallet.getUsers(auth)
            const targetGroup = authUsers.find((user) => user.userId === groupId)
            expect(targetGroup?.groupInfo?.threshold).to.be.equal(3)
        })

        it("remove group", async () => {
            const operation = await wallet.removeGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
            const groupKey = keccak256(concat([groupId, userAuthContractAddr]))
            const storedGroupData: Hex = await WALLET_CONTRACT_INTERFACE.readFromChain(
                await wallet.getAddress(),
                "getState",
                [groupKey],
                chain
            )

            expect(storedGroupData).to.be.equal("0x")
            const authUsers = await wallet.getUsers(auth)
            const targetGroup = authUsers.find((user) => user.userId === groupId)
            expect(targetGroup).to.be.undefined
        })
    })
}
