import { expect } from "chai"
import { Hex, pad } from "viem"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { Chain } from "../../src/data"
import { FunKit } from "../../src/FunKit"
import { fundWallet, generateRandomGroupId, randomBytes } from "../../src/utils"
import { getOnChainGroupData } from "../../src/utils/GroupUtils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface GroupTestConfig {
    chainId: number
    index?: number
    prefundAmt: number
    baseToken: string
}

export const GroupTest = (config: GroupTestConfig) => {
    const { chainId, prefundAmt, baseToken } = config
    describe("Group Op ", function () {
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        let groupId: Hex
        let memberIds: Hex[] = []
        let fun: FunKit

        const threshold = 2
        const newUserId = randomBytes(20)
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth = new FunKit(options).getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 179709)
            chain = wallet.getChain()

            memberIds = [
                pad(randomBytes(20), { size: 32 }),
                pad(randomBytes(20), { size: 32 }),
                pad(randomBytes(20), { size: 32 }),
                (await auth.getUserId()).toLowerCase() as Hex
            ].sort((a, b) => b.localeCompare(a))

            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
            }

            if (Number(await wallet.getToken(baseToken).getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }
            groupId = generateRandomGroupId()
        })

        it("add group", async () => {
            const operation = await wallet.createGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                group: {
                    userIds: memberIds,
                    threshold: threshold
                }
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            if (config.chainId === 1) {
                await new Promise((r) => setTimeout(r, 15000))
            }

            const groupData = await getOnChainGroupData(groupId, chain, await wallet.getAddress())
            expect(groupData.memberIds).to.be.deep.equal(memberIds)
            expect(groupData.threshold).to.be.equal(threshold)
        })

        it("add user to group", async () => {
            const operation = await wallet.addUserToGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                userId: newUserId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            if (config.chainId === 1) {
                await new Promise((r) => setTimeout(r, 15000))
            }
            await new Promise((r) => setTimeout(r, 2000))

            const currentMemberIds = memberIds.concat(pad(newUserId, { size: 32 })).sort((a, b) => b.localeCompare(a))
            const groupData = await getOnChainGroupData(groupId, chain, await wallet.getAddress())
            expect(groupData.memberIds).to.be.deep.equal(currentMemberIds)
            expect(groupData.threshold).to.be.equal(threshold)
        })

        it("remove user from group", async () => {
            const operation = await wallet.removeUserFromGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                userId: newUserId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            if (config.chainId === 1) {
                await new Promise((r) => setTimeout(r, 15000))
            }

            const groupData = await getOnChainGroupData(groupId, chain, await wallet.getAddress())
            expect(groupData.memberIds).to.be.deep.equal(memberIds)
            expect(groupData.threshold).to.be.equal(threshold)
        })

        it("update group threshold", async () => {
            const operation = await wallet.updateThresholdOfGroup(auth, await auth.getAddress(), {
                groupId: groupId,
                threshold: 3
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            if (config.chainId === 1) {
                await new Promise((r) => setTimeout(r, 15000))
            }

            const groupData = await getOnChainGroupData(groupId, chain, await wallet.getAddress())
            expect(groupData.memberIds).to.be.deep.equal(memberIds)
            expect(groupData.threshold).to.be.equal(3)
        })

        it("remove group", async () => {
            const operation = await wallet.removeGroup(auth, await auth.getAddress(), {
                groupId: groupId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw

            if (config.chainId === 1) {
                await new Promise((r) => setTimeout(r, 15000))
            }

            const groupData = await getOnChainGroupData(groupId, chain, await wallet.getAddress())
            expect(groupData.memberIds).to.be.deep.equal([])
            expect(groupData.threshold).to.be.equal(0)
        })
    })
}
