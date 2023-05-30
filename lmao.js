const ethers = require("ethers")
const { FunWallet, configureEnvironment } = require("./index")
const { Eoa } = require("./auth")
const { fundWallet } = require("./utils")
const { GaslessSponsor, TokenSponsor} = require("./sponsors")
const { Token } = require("./data")

const API_KEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const PRIVATE_KEY = "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064"

async function main() {
    const auth = new Eoa({ privateKey: PRIVATE_KEY })
    const uniqueId = await auth.getUniqueId()
    // Create a unique FunWallet based on the provided auth
    const funWallet = new FunWallet({ uniqueId:129 })
    const addr = await funWallet.getAddress()
    await configureEnvironment({
        apiKey: API_KEY,
        gasSponsor: {
            sponsorAddress: addr
        }
    })
    console.log(await funWallet.getAddress())
    // await funWallet.create(auth)
    const sponsor = new TokenSponsor({ gasSponsor: { sponsorAddress: await auth.getUniqueId(), token:"asdfdasf"} })
    // const deposit = await sponsor.approve("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767", 0.4)

    // const deposit = sponsor.stakeToken("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767",addr,0.3)
    // const deposit=await sponsor.setToWhitelistMode()
    // const deposit= await sponsor.removeSpenderFromWhiteList("0xE8448945F00bf10EfFa2Ddf935B74B3527F29DB9")
    const deposit = await sponsor.stake(addr, .01)
    // console.log(await deposit())
    // await auth.sendTx(deposit)
    await funWallet.sendTx({ auth, call: deposit },{ apiKey: API_KEY, gasSponsor:{
        sponsorAddress:"0xa80eC6B84aa3E52b8D0eB364fc3c1D9f685aD531",
        // token: "0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767"
    }})
    //  console.log(await sponsor.getTokenBalance("0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767", addr))


}

main()