import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 420,
    baseToken: "eth",
    prefund: true,
    nftAddress: "0xa0983dF411adC7dbF59B6A460Ca25B446E0Cab48",
    tokenId: 10,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb"
}
NFTTest(config)
