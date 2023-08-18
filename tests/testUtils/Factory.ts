import { expect } from "chai"
import { Hex } from "viem"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { fundWallet, randomBytes } from "../../src/utils/ChainUtils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"

import "../../fetch-polyfill"

export interface FactoryTestConfig {
    chainId: number
    testCreate?: boolean
    prefundAmt: number
    numRetry?: number
}

export const FactoryTest = (config: FactoryTestConfig) => {
    const { chainId } = config
    describe("Factory", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        let auth: Auth
        let auth2: Auth
        let wallet: FunWallet
        let uniqueId: Hex

        this.timeout(400_000)
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            await configureEnvironment(options)

            uniqueId = randomBytes(32)

            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            auth2 = new Auth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2")) as Hex })
            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId
            })
        })

        it("wallet should have the same address with a uniqueId-index combination", async () => {
            const wallet1 = new FunWallet({ users: [{ userId: await auth.getAddress() }], uniqueId })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.be.equal(wallet1Address)
        })

        it("wallet.create should create a wallet", async () => {
            if (config.testCreate) {
                const wallet1 = new FunWallet({ users: [{ userId: await auth.getAddress() }], uniqueId: randomBytes(32) })
                let isContract = await wallet1.getDeploymentStatus()
                expect(isContract).to.be.false
                await fundWallet(auth, wallet1, config.prefundAmt ? config.prefundAmt : 0.5)
                await wallet1.create(auth, await auth.getAddress())
                isContract = await wallet1.getDeploymentStatus()
                expect(isContract).to.be.true
            }
        })

        it("wallet should not have the same address with a different index", async () => {
            const wallet1 = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(18)
            })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })

        it("wallet should not have the same address with a different uniqueId", async () => {
            const wallet1 = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth2.getWalletUniqueId(3923)
            })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })

        it("initialize fun wallet with walletAddr should work", async () => {
            const walletAddress = await wallet.getAddress()
            const wallet1 = new FunWallet({
                walletAddr: walletAddress
            })
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.be.equal(wallet1Address)
        })
    })
}
