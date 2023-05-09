const ethers = require("ethers")
const { FunWallet, configureEnvironment } = require("./index")
const { Eoa } =  require("./auth")
const { fundWallet, } = require("./utils")
const { Token } = require("./data/index")
const PRIVATE_KEY = "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064"
const DEST_ADDR = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"

async function main() {
  await configureEnvironment({
    chain: 421613,
  })

  const auth = new Eoa({ privateKey: PRIVATE_KEY })
  const uniqueId = auth.getUniqueId()

  const funWallet = new FunWallet( { uniqueId} )
  const addr = await funWallet.getAddress()
  console.log(addr)
//   await fundWallet(auth,funWallet,0.5)
  
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

