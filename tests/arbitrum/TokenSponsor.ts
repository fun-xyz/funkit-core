import * as dotenv from "dotenv"
import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"
dotenv.config()

const PREFUND = process.env.PREFUND === "true" ? true : false
const config: TokenSponsorTestConfig = {
    chainId: 42161,
    inToken: "eth",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    paymasterToken: "0x53589543A64408AA03ba709EFCD1a7f03AA6880D",
    baseTokenStakeAmt: 0.02,
    paymasterTokenStakeAmt: 1000,
    prefund: PREFUND,
    swapAmount: 0.00001,
    stake: true,
    walletIndex: 0,
    funderIndex: 1
}

TokenSponsorTest(config)
