const StakeTest = (config) => {
  const { chainId, authPrivateKey, outToken, baseToken, prefund } = config
  const { assert } = require("chai")
  const { Wallet } = require("ethers")
  const { Eoa } = require("../../auth")
  const { Token } = require("../../data")
  const { configureEnvironment } = require("../../managers")
  const { fundWallet, getTestApiKey } = require("../../utils")
  const { FunWallet } = require("../../wallet")

  describe("Stake", function () {
    this.timeout(120_000)
    let auth
    let wallet
    const amount = .01
    before(async function () {
      let apiKey = await getTestApiKey()
      const options = {
        chain: chainId,
        apiKey: apiKey,
        gasSponsor: null
      }
      await configureEnvironment(options)
      auth = new Eoa({ privateKey: authPrivateKey })
      uniqueId = await auth.getUniqueId()
      wallet = new FunWallet({ uniqueId, index: 17928340 })
      if (prefund)
        await fundWallet(auth, wallet, .02)
      const walletAddress = await wallet.getAddress()
      // const tokenBalanceBefore = (await Token.getBalance(outToken, walletAddress))
      // if (tokenBalanceBefore < amount) {
      //   await wallet.swap(auth, {
      //     in: baseToken,
      //     amount: .1,
      //     out: outToken
      //   })
      //   const tokenBalanceAfter = (await Token.getBalance(outToken, walletAddress))
      //   assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
      // }

    })

    it("wallet should have lower balance of specified token", async () => {
      const receipt = await wallet.stake(auth, { amount })
      console.log(receipt)
    })

  })
}
module.exports = { StakeTest }