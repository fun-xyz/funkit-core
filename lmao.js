const ethers = require("ethers")
const { FunWallet, configureEnvironment } = require("./index")
const { Eoa } = require("./auth")
const { fundWallet } = require("./utils")
const { GaslessSponsor } = require("./sponsors")

const API_KEY = "MYny3w7xJh6PRlRgkJ9604sHouY2MTke6lCPpSHq"
const PRIVATE_KEY = "0x98e9cfb323863bc4bfc094482703f3d4ac0cd407e3af2351c00dde1a6732756a"

async function main() {
    const auth = new Eoa({ privateKey: PRIVATE_KEY })
    const uniqueId = await auth.getUniqueId()
    // Create a unique FunWallet based on the provided auth
    const funWallet = new FunWallet({ uniqueId,index:534 })
    const addr = await funWallet.getAddress()
    await configureEnvironment({
        apiKey: API_KEY,
        gasSponsor: {
            sponsorAddress: addr
        }
    })

    // await funWallet.create(auth)
    const sponsor = new GaslessSponsor({ gasSponsor: { sponsorAddress: await auth.getUniqueId() } })


    console.log(addr)
    const deposit = await sponsor.stake(addr, .01)
    // console.log(await deposit())
    await funWallet.sendTx({ auth, call: deposit },{ apiKey: API_KEY, gasSponsor:null })

}

main()