import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 10,
    baseToken: "eth",
    tokenId: 10,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb"
}
NFTTest(config)
