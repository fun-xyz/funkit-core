import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 5,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    baseToken: "eth",
    prefund: true,
    nftAddress: "0xdFb5778fDbD15d8cb0e37d278CcC2ba9751aa5fc"
}
NFTTest(config)
