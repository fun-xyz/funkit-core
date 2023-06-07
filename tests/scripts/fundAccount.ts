const WALLETS = [
    "0x175C5611402815Eba550Dad16abd2ac366a63329",
    "0x07Ac5A221e5b3263ad0E04aBa6076B795A91aef9",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
]
const AMOUNT = "10000"
const NETWORK = "https://rpc.vnet.tenderly.co/devnet/bundler-test/25a05917-cd90-4929-a7e0-8b16373dfb21"
import { JsonRpcProvider } from "@ethersproject/providers"
import { ethers } from "ethers"

const main = async () => {
    const provider = new JsonRpcProvider(NETWORK)
    await provider.send("tenderly_addBalance", [
        WALLETS,
        //amount will be added for all wallets
        ethers.utils.hexValue(ethers.utils.parseUnits(AMOUNT, "ether").toHexString())
    ])
}

main()
