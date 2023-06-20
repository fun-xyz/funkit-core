import fs from "fs"
import path from "path"
import * as dotenv from "dotenv"
dotenv.config()

const tenderlyDir = process.env.CODEBUILD_SRC_DIR_DeployedSmartContract + "/deployments/tenderly"
const abisDir = "src/abis"
console.log(tenderlyDir)

if (tenderlyDir) {
    const chainId = fs.readFileSync(path.join(tenderlyDir, ".chainId"), "utf8")

    fs.readdir(tenderlyDir, (err, files) => {
        if (err) throw err

        files.forEach((file) => {
            if (path.extname(file) === ".json") {
                const originalJson = JSON.parse(fs.readFileSync(path.join(tenderlyDir, file), "utf8"))

                let transformedJson = {
                    name: path.basename(file, ".json"),
                    abi: originalJson.abi,
                    addresses: {
                        [chainId]: originalJson.address
                    }
                }

                if (abisDir) {
                    const targetFile = path.join(abisDir, file)

                    if (fs.existsSync(targetFile)) {
                        const existingJson = JSON.parse(fs.readFileSync(targetFile, "utf8"))

                        existingJson.addresses[chainId] = originalJson.address

                        if (transformedJson.abi) {
                            existingJson.abi = transformedJson.abi
                        }

                        transformedJson = existingJson
                    }

                    fs.writeFileSync(targetFile, JSON.stringify(transformedJson, null, 2))
                }
            }
        })
    })
} else {
    console.error("tenderlyDir is undefined. Cannot proceed with the file operations.")
}
