import fs from "fs"
import path from "path"
import { getTestApiKey } from "./getAWSSecrets"
import { getContractAbi } from "../src/apis/ContractApis"
import { GlobalEnvOption, configureEnvironment } from "../src/config"
import { Chain } from "../src/data"

async function setGlobal() {
    const apiKey = await getTestApiKey()
    const options: GlobalEnvOption = {
        chain: new Chain({ chainId: "5" }),
        apiKey: apiKey
    }
    await configureEnvironment(options)
}

const loadAbis = async (): Promise<void> => {
    await setGlobal()

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
        "univ3router"
    ]

    for (const contract of contracts) {
        try {
            const data = await getContractAbi(contract)
            const fileName = `${contract}.json`
            const dir = path.resolve(__dirname, "../src/abis")
            const filePath = path.join(dir, fileName)

            fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true })

            // Check if the file already exists, delete if it does
            if (fs.existsSync(filePath)) {
                console.log(`File ${filePath} already exists. It will be replaced.`)
                fs.unlinkSync(filePath)
            }

            try {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
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
