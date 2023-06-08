const ethers = require("ethers")
const { FunWallet, configureEnvironment } = require("./index")
const { Eoa } = require("./auth")
const { fundWallet } = require("./utils")
const { GaslessSponsor, TokenSponsor } = require("./sponsors")
const { Token } = require("./data")

const API_KEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const PRIVATE_KEY = "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064"

async function main() {
    const auth = new Eoa({ privateKey: PRIVATE_KEY })
    const uniqueId = await auth.getUniqueId()
    // Create a unique FunWallet based on the provided auth
    const funWallet = new FunWallet({ uniqueId: 130 })
    await configureEnvironment({
        apiKey: API_KEY,
        // gasSponsor: {
        //     sponsorAddress: '0xcd63cB2374e49f88083d79D5f7891be5734cdc68'
        // }
    })
    const authAddress = await auth.getUniqueId()
    const walletaddr = await funWallet.getAddress()
    // await funWallet.create(auth)
    const sponsor = new TokenSponsor({ gasSponsor: { sponsorAddress: await auth.getUniqueId(), token: "asdfdasf" } })
    // const sponsor = new GaslessSponsor({ gasSponsor: { sponsorAddress: await auth.getUniqueId(), token: "asdfdasf" } })

    // const deposit = await sponsor.approve("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767", 0.4)
    // // const deposit = sponsor.stakeToken("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767",wallet,0.3)
    // const deposit=await sponsor.setToWhitelistMode()
    // const sponsoraddr = await sponsor.getPaymasterAddress()
    const token = "0xAA8958047307Da7Bb00F0766957edeC0435b46B5"
    // const deposit = sponsor.unlockDepositAfter(0)
    // const deposit = sponsor.lockDeposit()
    // const deposit = await sponsor.unlockTokenDepositAfter(token, 0)
    // const deposit = await sponsor.lockTokenDeposit(token, 0)
    // const deposit = await sponsor.unlockTokenDepositAfter(token, walletaddr, 50)
    // console.log((await sponsor.getTokenBalance(token, walletaddr)).toString())
    // console.log((await Token.getBalance(token, sponsoraddr)).toString())
    // const unlock = await sponsor.unlockTokenDepositAfter(token, 0)
    // const unstake = await sponsor.unstakeToken("0xAA8958047307Da7Bb00F0766957edeC0435b46B5", wallet, 50)
    // await auth.sendTx(unlock)
    // console.log(await sponsor.getAllTokenData(token, walletaddr))
    // const deposit= await sponsor.removeSpenderFromWhiteList("0xE8448945F00bf10EfFa2Ddf935B74B3527F29DB9")
    // const deposit = await sponsor.addSpenderToBlackList("0xE8448945F00bf10EfFa2Ddf935B74B3527F29DB9")
    // const deposit = await sponsor.setToBlacklistMode()
    // const deposit = await sponsor.batchWhitelistUsers(['0x07865c6e87b9f70255377e024ace6630c1eaa37f', '0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767', '0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093'], [true, true, false])
    // console.log(await deposit())
    // await auth.sendTx(deposit)
    // const deposit = await sponsor.approve("0xAA8958047307Da7Bb00F0766957edeC0435b46B5",200)
    // const deposit = await sponsor.stakeToken("0xAA8958047307Da7Bb00F0766957edeC0435b46B5",walletaddr,200)
    // // const deposit=await sponsor.setToWhitelistMode()
    // console.log((await sponsor.getLockState(token, walletaddr))) //0 or greater than current block number lock. 
    // console.log((await sponsor.getLockState("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767", walletaddr))) //0 or greater than current block number lock. 
    // console.log((await sponsor.getLockState("eth", walletaddr)))
    // console.log(walletaddr)
    // console.log(await sponsor.getListMode("0xcd63cB2374e49f88083d79D5f7891be5734cdc68"))
    // console.log(await sponsor.getSpenderWhitelisted("0xcd63cB2374e49f88083d79D5f7891be5734cdc68","0xf7aDDE90eD64812D0A55FFd8847F644aEFCd04aa"))
    const deposit = await sponsor.batchWhitelistUsers(["0x5958381730478d01b4AE44526F2eE87f0b65388C", "0xD797E4Aa7232Ef6fcC69446028a36BC2CF14bc14"], [true, true])
    // auth.sendTx(deposit)
    // console.log(await auth.getUniqueId())
    await funWallet.sendTx({ auth, call: deposit }, {
        apiKey: API_KEY,
        // gasSponsor: {
        //     sponsorAddress: '0xcd63cB2374e49f88083d79D5f7891be5734cdc68',
        //     // token: "0xAA8958047307Da7Bb00F0766957edeC0435b46B5"
        // }
    })
    // await funWallet.transfer(auth, { to: "0x175C5611402815Eba550Dad16abd2ac366a63329", amount: 0.02, token: "eth" }, {
    //     apiKey: API_KEY,
    //     gasSponsor: {
    //         sponsorAddress: '0xcd63cB2374e49f88083d79D5f7891be5734cdc68',
    //         // token: "0xAA8958047307Da7Bb00F0766957edeC0435b46B5"
    //     }
    // })
    // console.log((await sponsor.getLockState(token, walletaddr))) //0 or greater than current block number lock. 
    // console.log((await sponsor.getLockState("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767", walletaddr))) //0 or greater than current block number lock. 
    // console.log((await sponsor.getLockState("eth", walletaddr)))







    //  console.log(await sponsor.getTokenBalance("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767", wallet))

}

main()