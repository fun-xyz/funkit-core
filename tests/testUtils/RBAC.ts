import { assert, expect } from "chai"
import { Address, pad } from "viem"
import { Auth } from "../../src/auth"
import { HashZero, WALLET_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption } from "../../src/config"
import { Chain } from "../../src/data"
import { FunKit } from "../../src/FunKit"
import { fundWallet, randomBytes } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface RBACTestConfig {
    chainId: number
    prefundAmt: number
    index?: number
    baseToken: string
}

export const RBACTest = (config: RBACTestConfig) => {
    const { chainId, prefundAmt, baseToken } = config
    describe("Single Auth RBAC Op ", function () {
        this.timeout(200_000)
        let auth: Auth
        let wallet: FunWallet
        let chain: Chain
        let rbacContractAddr: Address
        let ownerId: Address
        let fun: FunKit

        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }

            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet = await fun.createWalletWithAuth(auth, config.index ? config.index : 1792811340)

            chain = wallet.getChain()
            if (!(await wallet.getDeploymentStatus())) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.2)
                try {
                    const op = await wallet.create(auth, await auth.getAddress())
                    await wallet.executeOperation(auth, op)
                } catch (e: any) {
                    assert(false, `Failed to deploy wallet ${e}`)
                }
            }
            if (Number(await wallet.getToken(baseToken).getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 0.1)
            }

            rbacContractAddr = chain.getAddress("rbacAddress")
            ownerId = randomBytes(32)
        })

        it("add owner", async () => {
            const operation = await wallet.addOwner(auth, await auth.getAddress(), {
                ownerId: ownerId
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

        // TODO: skip until staging -> main
        it.skip("remove owner", async () => {
            const operation = await wallet.removeOwner(auth, await auth.getAddress(), {
                ownerId: ownerId
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
