import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 5,
    baseToken: "eth",
    prefund: true,
    nftAddress: "0xdFb5778fDbD15d8cb0e37d278CcC2ba9751aa5fc",
    tokenId: 10,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb"
}
NFTTest(config)
