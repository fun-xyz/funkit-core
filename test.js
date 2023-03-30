const { Eoa } = require("./auth")
const { Token } = require("./data")
const { configureEnvironment } = require("./managers")
const { TEST_PRIVATE_KEY, prefundWallet } = require("./utils")
const { FunWallet } = require("./wallet")

const options = {
    chain: 36864,
    apiKey: "localtest",
}
const main = async () => {
    await configureEnvironment(options)
    let auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    salt = await auth.getUniqueId()
    const wallet = new FunWallet({ salt, index: 013423 })
    const walletAddress = await wallet.getAddress()
    await prefundWallet(auth, wallet, 10)
    const token = new Token("usdc")
    const approve = await token.approve(salt, 10)
    await wallet.sendTx({ auth, call: approve })

    const contract = await token.getContract()
    console.log(await contract.allowance(walletAddress, salt))

}

main()