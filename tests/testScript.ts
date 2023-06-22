import { Eoa } from "../src/auth"
import { configureEnvironment } from "../src/config"
import { TokenSponsor } from "../src/sponsors"
import { FunWallet } from "../src/wallet"
const API_KEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const PRIVATE_KEY = "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064"

async function main() {
    await configureEnvironment({
        chain: "5",
        apiKey: API_KEY
        // gasSponsor: {
        //     sponsorAddress: "0x1c1adFD4b2c21D8a1e39153D394d8309Db383E43",
        //     token: "0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093"
        // }
    })
    const auth = new Eoa({ privateKey: PRIVATE_KEY })
    const uniqueId = await auth.getUniqueId()
    const funWallet = new FunWallet({ uniqueId, index: 133223433230 })
    console.log(await funWallet.getAddress())

    const sponsor = new TokenSponsor({
        chain: "5",
        gasSponsor: {
            sponsorAddress: "0x1c1adFD4b2c21D8a1e39153D394d8309Db383E43",
            token: "0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093"
        }
    })
    // // 1. Approve the token and the amount
    // const approve = await sponsor.approve("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", 200)
    // await funWallet.execute(auth, approve)

    // // 2. Stake the token and the amount
    const stake = await sponsor.stake("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", 0.2)
    await funWallet.execute(auth, stake)

    // console.log(await sponsor.getTokenBalance("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", "0xeb32d09f0B46548Cdc604309D0611F05D8f706D3"))

    // const call = sponsor.setToBlacklistMode()
    // await funWallet.execute(auth, call)
    // console.log(await funWallet.transfer(auth, { to: "0x175C5611402815Eba550Dad16abd2ac366a63329", amount: 0.01, token: "eth" }))
}

main()
