const ethers = require("ethers")
const { FunWallet, configureEnvironment } = require("./index")
const { Eoa } =  require("./auth")
const { fundWallet, } = require("./utils")
const { Token } = require("./data/index")
const PRIVATE_KEY = "0x69f145cff5f134d4a09d0d7f6da2eef0d01c3b24a95500482f4744a03a774f50"
const DEST_ADDR = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"

async function main() {
  await configureEnvironment({
    chain: "36865",
  })

  const auth = new Eoa({ privateKey: PRIVATE_KEY })
  const uniqueId = auth.getUniqueId()

  const funWallet = new FunWallet( { uniqueId, index: 3} )
  const addr = await funWallet.getAddress()
  console.log(addr)
  // await fundWallet(auth,funWallet,500)
  
  // const token = new Token("eth")
  // const balBefore = token.getBalance(addr)
  const receipt = await funWallet.transfer(auth, {
    to: DEST_ADDR,
    amount: .0001,
    token: "eth"
  })
  // const balAfter = token.getBalance(addr)
  // console.log(balBefore, balAfter)
}

main()


