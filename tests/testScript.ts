import { Eoa } from "../src/auth"
import { configureEnvironment } from "../src/config"
import { GaslessSponsor } from "../src/sponsors/GaslessSponsor"
import { FunWallet } from "../src/wallet"
const API_KEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const PRIVATE_KEY = "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064"

async function main() {
    await configureEnvironment({
        chain: "5",
        apiKey: API_KEY,
        gasSponsor: {
            sponsorAddress: "0x1c1adFD4b2c21D8a1e39153D394d8309Db383E43"
            // token: "paymasterToken"
        }
    })
    const auth = new Eoa({ privateKey: PRIVATE_KEY })
    const uniqueId = await auth.getUniqueId()
    const funWallet = new FunWallet({ uniqueId, index: 13230 })
    console.log(await funWallet.getAddress())
    const sponsor = new GaslessSponsor({
        chain: "5",
        gasSponsor: {
            sponsorAddress: "0x1c1adFD4b2c21D8a1e39153D394d8309Db383E43"
            // token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        }
    })
    const call = sponsor.setToBlacklistMode()

    await funWallet.execute(auth, call)
}

main()
