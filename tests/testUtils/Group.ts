import { expect } from "chai"
import { Address, Hex, concat, decodeAbiParameters, keccak256, pad } from "viem"
import { Auth } from "../../src/auth"
import { WALLET_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, getChainFromData } from "../../src/data"
import { fundWallet, generateRandomGroupId, isContract, randomBytes } from "../../src/utils"
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
    describe.only("Group Op ", function () {
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        let userAuthContractAddr: Address
        let groupId: Hex
        const threshold = 2
        const memberIds: Hex[] = [
            pad(randomBytes(20), { size: 32 }),
            pad(randomBytes(20), { size: 32 }),
            pad(randomBytes(20), { size: 32 })
        ].sort((a, b) => b.localeCompare(a))
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
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 179388)
            })
            chain = await getChainFromData(chainId)
            const isWalletCreated = await isContract(await wallet.getAddress(), await chain.getClient())
            if (!isWalletCreated) {
                expect(await wallet.create(auth, await auth.getAddress())).to.not.throw
            }
            if (prefund) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }
            userAuthContractAddr = await chain.getAddress("userAuthAddress")
            groupId = generateRandomGroupId()
        })

        it("add group", async () => {
            const operation = await wallet.createGroup(auth, await auth.getAddress(), await wallet.getAddress(), {
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
            const [storedGroup] = decodeAbiParameters(
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
        })

        it("add user to group", async () => {
            const operation = await wallet.addUserToGroup(auth, await auth.getAddress(), await wallet.getAddress(), {
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
            const [storedGroup] = decodeAbiParameters(
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

        it("remove user from group", async () => {
            const operation = await wallet.removeUserFromGroup(auth, await auth.getAddress(), await wallet.getAddress(), {
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
            const [storedGroup] = decodeAbiParameters(
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
            const [storedGroup] = decodeAbiParameters(
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
        })
    })
}
