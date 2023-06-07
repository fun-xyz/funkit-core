import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 36865,
    baseToken: "eth",
    prefund: true,
    nftAddress: "0xab8e5bad3049df8365eba0bdc16f7392633dee32",
    amount: 1,
    tokenId: 3,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb"
}
NFTTest(config)
