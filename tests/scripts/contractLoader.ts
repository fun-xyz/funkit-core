import fs from "fs"
import path from "path"
import { getContractAbi } from "../../src/apis/ContractApis"
import { getTestApiKey } from "../getAWSSecrets"

const loadAbis = async (): Promise<void> => {
    const apiKey = await getTestApiKey()
    const contracts = [
        "EntryPoint",
        "UserAuthentication",
        "ApproveAndSwap",
        "ApproveAndExec",
        "AaveWithdraw",
        "FunWalletFactory",
        "FunWallet",
        "TokenPaymaster",
        "GaslessPaymaster",
        "TokenPriceOracle",
        "FeePercentOracle",
        "RoleBasedAccessControl",
        "GELATO_MSG_SENDER",
        "WETH",
        "univ3factory",
        "univ3quoter",
        "univ3router",
        "TestNFT"
    ]

    for (const contract of contracts) {
        try {
            const data = await getContractAbi(contract, apiKey)
            const fileName = `${contract}.json`
            const dir = path.resolve(__dirname, "../../src/abis")
            const filePath = path.join(dir, fileName)

            fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true })

            // Check if the file already exists, delete if it does
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }

            try {
                fs.writeFileSync(filePath, JSON.stringify(data, null))
                console.log("SUCCESS: ", fileName)
            } catch (error) {
                console.error(`Failed to write to ${filePath}:`, error)
            }
        } catch (error) {
            console.error("ERROR: ", contract)
            console.error(error)
        }
    }
}

if (require.main === module) {
    loadAbis()
}
