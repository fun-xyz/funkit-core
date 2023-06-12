import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 420,
    baseToken: "eth",
    prefund: true,
    nftAddress: "0x2b50ee9a741f0da3f6ca9e68bd3dcd22cdbe7a49",
    tokenId: 10,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb"
}
NFTTest(config)
