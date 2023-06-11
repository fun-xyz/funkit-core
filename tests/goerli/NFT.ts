import * as dotenv from "dotenv"
import { NFTTest, NFTTestConfig } from "../testUtils/NFT"
dotenv.config()

const config: NFTTestConfig = {
    chainId: 5,
    baseToken: "eth",
    prefund: true,
    nftAddress: "0xF1C4d47943643E221e8e71A887366f90D717c0D8",
    tokenId: 10,
    testNFTName: "Anatomy Science Ape Club",
    testNFTAddress: "0x96fc56721d2b79485692350014875b3b67cb00eb"
}
NFTTest(config)
