import { Eoa } from "../../src/auth"
import { LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID } from "../../src/common/constants"
import { expect } from "chai"
import { randomBytes } from "ethers/lib/utils";
import { GlobalEnvOption, configureEnvironment } from "../../src/config";
import { FunWallet } from "../../src/wallet";
import { isContract, fundWallet } from "../../src/utils/chain";
import { getTestApiKey } from "../testUtils";

export interface FactoryTestConfig {
    chainId: number
    authPrivateKey: string
    testCreate?: boolean
    prefundAmt?: number
}

export const FactoryTest = (config: FactoryTestConfig) => {
    const { chainId, authPrivateKey } = config

    describe("Factory", function () {
        let auth: Eoa
        let wallet: FunWallet
        let uniqueId: string
        
        this.timeout(100_000)
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId.toString(),
                apiKey: apiKey,
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            uniqueId = randomBytes(32).toString();
            wallet = new FunWallet({ uniqueId, index: 3123 })
        })

        it("wallet should have the same address with a uniqueId-index combination", async () => {
            const wallet1 = new FunWallet({ uniqueId, index: 3123 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.be.equal(wallet1Address)
        })

        it("wallet.create should create a wallet", async () => {
            if (chainId == FUN_TESTNET_CHAIN_ID || chainId == LOCAL_FORK_CHAIN_ID || config.testCreate) {
                const index = Math.random() * 10000
                const wallet1 = new FunWallet({ uniqueId, index })
                const walletAddress = await wallet1.getAddress()
                let iscontract = await isContract(walletAddress)
                expect(iscontract).to.be.false
                await fundWallet(auth, wallet1, config.prefundAmt? config.prefundAmt: .5)
                await wallet1.create(auth)
                iscontract = await isContract(walletAddress)
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
            let uniqueId1 = randomBytes(32).toString();
            const wallet1 = new FunWallet({ uniqueId: uniqueId1, index: 3923 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })
    })
}