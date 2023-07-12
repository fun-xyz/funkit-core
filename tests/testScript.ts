// import { Eoa } from "../src/auth"
// import { configureEnvironment } from "../src/config"
// import { GaslessSponsor } from "../src/sponsors/GaslessSponsor"
// import { FunWallet } from "../src/wallet"
// const API_KEY = ""
// const PRIVATE_KEY = ""

// async function main() {
//     await configureEnvironment({
//         chain: "5",
//         apiKey: API_KEY,
//         gasSponsor: {
//             sponsorAddress: "0x175C5611402815Eba550Dad16abd2ac366a63329"
//             // token: "0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093"
//         }
//     })
//     const auth = new Eoa({ privateKey: PRIVATE_KEY })
//     const uniqueId = await auth.getUniqueId()
//     const funWallet = new FunWallet({ uniqueId, index: 1332234333230 })
//     console.log(await funWallet.getAddress())

//     const sponsor = new GaslessSponsor({
//         chain: "5",
//         gasSponsor: {
//             sponsorAddress: "0x1c1adFD4b2c21D8a1e39153D394d8309Db383E43",
//             token: "0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093"
//         }
//     })
//     // // 1. Approve the token and the amount
//     // const tx = await sponsor.approve("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", 200)
//     // await funWallet.execute(auth, approve)
//     // const tx = await sponsor.setToWhitelistMode()
//     // const tx = await sponsor.setTokenToWhiteListMode()
//     const tx = await sponsor.setToBlacklistMode()
//     // // 2. Stake the token and the amount
//     // const tx = await sponsor.stake("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", 0.2)
//     await funWallet.execute(auth, tx)
//     // tx = await sponsor.batchBlacklistUsers(
//     //     [
//     //         "0x07Ac5A221e5b3263ad0E04aBa6076B795A91aef9",
//     //         "0xA8c2c6F54228302E106FCFE6b36909453976f400",
//     //         "0x17dCA013EE7927576d1797F7A3Dc7C0231D2646c"
//     //     ],
//     //     [false, false, false]
//     // )
//     // // // 2. Stake the token and the amount
//     // // const tx = await sponsor.stake("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", 0.2)
//     // await funWallet.execute(auth, tx)

//     // console.log(await sponsor.getTokenBalance("0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093", "0xeb32d09f0B46548Cdc604309D0611F05D8f706D3"))

//     // const call = sponsor.setToBlacklistMode()
//     // await funWallet.execute(auth, call)
//     // console.log(await funWallet.transfer(auth, { to: "0x175C5611402815Eba550Dad16abd2ac366a63329", amount: 0.01, token: "eth" }))
// }

// main()
