import { TransferTest, TransferTestConfig } from '../testUtils/Transfer'
import * as dotenv from 'dotenv'
dotenv.config()

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config: TransferTestConfig = {
    chainId: 5,
    authPrivateKey: process.env.WALLET_PRIVATE_KEY!,
    outToken: "dai",
    baseToken: "eth",
    prefund: PREFUND
}
TransferTest(config)