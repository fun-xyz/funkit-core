import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 36865,
    baseToken: "eth",
    prefundAmt: 1,
    tokenId: 3,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb",
    numRetry: 0
}
NFTTest(config)
