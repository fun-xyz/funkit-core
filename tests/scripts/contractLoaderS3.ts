import { execSync } from "child_process"
import fs from "fs"
import path from "path"

const deploymentsDir = process.env.CODEBUILD_SRC_DIR_DeployedSmartContract
    ? process.env.CODEBUILD_SRC_DIR_DeployedSmartContract + "/deployments"
    : "../fun-wallet-smart-contract/deployments"
const abisDir = "src/abis"

if (deploymentsDir.startsWith("../fun-wallet-smart-contract/deployments")) {
    if (!fs.existsSync("../fun-wallet-smart-contract")) {
        console.log("fun-wallet-smart-contract repo not found. Cloning now...")
        execSync("git clone https://github.com/TheFunGroup/fun-wallet-smart-contract.git ../fun-wallet-smart-contract")
    }
    const branch = execSync("git -C '../fun-wallet-smart-contract' rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim()
    console.log(`Loading from local smart contract directory, branch: ${branch}`)
}

if (fs.existsSync(deploymentsDir)) {
    fs.readdir(deploymentsDir, (err, folders) => {
        if (err) throw err

        folders.forEach((folder) => {
            if (folder !== abisDir) {
                updateAbiFilesForNetwork(folder)
            }
            console.log("Loaded:", folder)
        })
    })
} else {
    console.error("deploymentsDir does not exist. Cannot proceed with the file operations.")
}

function updateAbiFilesForNetwork(networkDir: string) {
    const fullNetworkDir = path.join(deploymentsDir, networkDir)
    const chainId = fs.readFileSync(path.join(fullNetworkDir, ".chainId"), "utf8")

    fs.readdir(fullNetworkDir, (err, files) => {
        if (err) throw err

        files.forEach((file) => {
            if (path.extname(file) === ".json") {
                updateAbiFile(chainId, file, fullNetworkDir)
            }
        })
    })
}

function updateAbiFile(chainId: string, file: string, networkDir: string) {
    const originalJson = JSON.parse(fs.readFileSync(path.join(networkDir, file), "utf8"))

    let transformedJson = {
        name: path.basename(file, ".json"),
        abi: originalJson.abi,
        addresses: {
            [chainId]: originalJson.address
        }
    }

    const targetFile = path.join(abisDir, file)
    if (fs.existsSync(targetFile)) {
        const existingJson = JSON.parse(fs.readFileSync(targetFile, "utf8"))

        existingJson.addresses[chainId] = originalJson.address
        if (transformedJson.abi) {
            existingJson.abi = transformedJson.abi
        }

        transformedJson = existingJson
    }

    fs.writeFileSync(targetFile, JSON.stringify(transformedJson, null, 0))
}
