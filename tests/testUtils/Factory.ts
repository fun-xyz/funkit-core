import { expect } from "chai"
import { Hex } from "viem"
import { Eoa } from "../../src/auth"
import { FUN_TESTNET_CHAIN_ID, LOCAL_FORK_CHAIN_ID } from "../../src/common/constants"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { getChainFromData } from "../../src/data"
import { fundWallet, isContract, randomBytes } from "../../src/utils/ChainUtils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"

import "../../fetch-polyfill"

export interface FactoryTestConfig {
    chainId: number
    testCreate?: boolean
    prefundAmt?: number
}

export const FactoryTest = (config: FactoryTestConfig) => {
    const { chainId } = config

    describe("Factory", function () {
        let auth: Eoa
        let wallet: FunWallet
        let uniqueId: string

        this.timeout(100_000)
        before(async function () {
            auth = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)

            uniqueId = randomBytes(32)
            wallet = new FunWallet({ uniqueId, index: 3123 })
        })

        it("wallet should have the same address with a uniqueId-index combination", async () => {
            const wallet1 = new FunWallet({ uniqueId, index: 3123 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.be.equal(wallet1Address)
        })

        it("wallet.create should create a wallet", async () => {
            if (chainId === FUN_TESTNET_CHAIN_ID || chainId === LOCAL_FORK_CHAIN_ID || config.testCreate) {
                const index = Math.random() * 1000000
                const wallet1 = new FunWallet({ uniqueId, index })
                const walletAddress = await wallet1.getAddress()
                const chain = await getChainFromData(chainId)
                let iscontract = await isContract(walletAddress, await chain.getClient())
                expect(iscontract).to.be.false
                await fundWallet(auth, wallet1, config.prefundAmt ? config.prefundAmt : 0.5)
                await wallet1.create(auth)
                iscontract = await isContract(walletAddress, await chain.getClient())
                expect(iscontract).to.be.true
            }
        })

        it("wallet should not have the same address with a different index", async () => {
            const wallet1 = new FunWallet({ uniqueId, index: 28 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })

        it("wallet should not have the same address with a different uniqueId", async () => {
            const uniqueId1 = randomBytes(32)
            const wallet1 = new FunWallet({ uniqueId: uniqueId1, index: 3923 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })
    })
}
