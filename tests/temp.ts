import { Eoa } from "../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../src/config"
import { TokenSponsor } from "../src/sponsors"
import { FunWallet } from "../src/wallet"

async function refillFunSponsor() {
    const apiKey = ""
    const options: GlobalEnvOption = {
        chain: "5",
        apiKey: apiKey
    }
    await configureEnvironment(options)
    const auth: Eoa = new Eoa({ privateKey: "0x8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38" })
    const funder: Eoa = new Eoa({ privateKey: "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064" })
    const wallet1 = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 2345234 })

    await configureEnvironment({
        chain: "5",
        apiKey: apiKey,
        gasSponsor: {
            sponsorAddress: await funder.getUniqueId(),
            token: "usdc"
        }
    })
    const gasSponsor = new TokenSponsor()
    const tokens = await gasSponsor.getAllTokens()
    for (const token of tokens) {
        const amount = await gasSponsor.getTokenBalance(token, await wallet1.getAddress())
        if (amount.eq(0)) continue
        console.log(token, await wallet1.getAddress(), amount.toString())

        const unlockTx = await gasSponsor.unlockTokenDepositAfter(token, 1)
        await configureEnvironment({
            chain: "5",
            apiKey: apiKey
        })
        console.log("UnlockTx", await wallet1.execute(auth, unlockTx))

        // unstake Token all tokens belonging to paymaster
        console.log(token, await wallet1.getAddress(), amount.toString())
        await configureEnvironment({
            chain: "5",
            apiKey: apiKey,
            gasSponsor: {
                sponsorAddress: await funder.getUniqueId(),
                token: "usdc"
            }
        })
        const unstake = await gasSponsor.unstakeToken(token, await wallet1.getAddress(), 1)
        await configureEnvironment({
            chain: "5",
            apiKey: apiKey
        })
        console.log("Unstake Token", await wallet1.execute(auth, unstake))

        // swap these tokens for eth
        const swap = await wallet1.swap(auth, {
            in: token,
            amount: 1,
            out: "eth"
        })
        console.log("SWAP", swap)
        // addEthDepositTo
        await configureEnvironment({
            chain: "5",
            apiKey: apiKey,
            gasSponsor: {
                sponsorAddress: await funder.getUniqueId(),
                token: "usdc"
            }
        })
        const stake = await gasSponsor.stake(await wallet1.getAddress(), 1)
        await configureEnvironment({
            chain: "5",
            apiKey: apiKey
        })
        console.log("Unstake Token", await wallet1.execute(auth, stake))
    }
}
refillFunSponsor()
