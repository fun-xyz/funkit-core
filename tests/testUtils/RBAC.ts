import { expect } from "chai"
import { Address, pad } from "viem"
import { Auth } from "../../src/auth"
import { HashZero, WALLET_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain } from "../../src/data"
import { fundWallet, isContract, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface RBACTestConfig {
    chainId: number
    prefundAmt?: number
    index?: number
}

export const RBACTest = (config: RBACTestConfig) => {
    const { chainId, prefundAmt } = config
    describe("Single Auth RBAC Op ", function () {
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        let rbacContractAddr: Address
        let ownerId: Address
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
                uniqueId: await auth.getWalletUniqueId(config.index ? config.index : 1792811340)
            })

            chain = await Chain.getChain({ chainIdentifier: chainId })
            const isWalletCreated = await isContract(await wallet.getAddress(), await chain.getClient())
            if (!isWalletCreated) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
                expect(await wallet.create(auth, await auth.getAddress())).to.not.throw
            }

            rbacContractAddr = await chain.getAddress("rbacAddress")
            ownerId = randomBytes(20)
        })

        it("add owner", async () => {
            const operation = await wallet.addOwner(auth, await auth.getAddress(), {
                ownerId: ownerId,
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
            const storedOwnerRule = await WALLET_CONTRACT_INTERFACE.readFromChain(
                await wallet.getAddress(),
                "getState32WithAddr",
                [pad(ownerId, { size: 32 }), rbacContractAddr],
                chain
            )

            expect(storedOwnerRule !== HashZero, "Owner rule not stored in wallet")
        })

        it("remove owner", async () => {
            const operation = await wallet.removeOwner(auth, await auth.getAddress(), {
                ownerId: ownerId,
                chainId: config.chainId
            })

            expect(await wallet.executeOperation(auth, operation)).to.not.throw
            const storedOwnerRule = await WALLET_CONTRACT_INTERFACE.readFromChain(
                await wallet.getAddress(),
                "getState32WithAddr",
                [pad(ownerId, { size: 32 }), rbacContractAddr],
                chain
            )

            expect(storedOwnerRule === HashZero, "Owner rule not stored in wallet")
        })
    })
}
