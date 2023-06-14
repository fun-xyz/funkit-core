import fs from "fs"
import path from "path"

const goerliDir = process.env.CODEBUILD_SRC_DIR_SmartContractSourceArtifact
const abisDir = "src/abis"
console.log(goerliDir)

if (goerliDir) {
    const chainId = fs.readFileSync(path.join(goerliDir, ".chainId"), "utf8")

    fs.readdir(goerliDir, (err, files) => {
        if (err) throw err

        files.forEach((file) => {
            if (path.extname(file) === ".json") {
                const originalJson = JSON.parse(fs.readFileSync(path.join(goerliDir, file), "utf8"))

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

                        if (transformedJson.addresses) {
                            existingJson.addresses.chainId = transformedJson.addresses
                        }

                        transformedJson = existingJson
                    }

                    fs.writeFileSync(targetFile, JSON.stringify(transformedJson, null, 2))
                }
            }
        })
    })
} else {
    console.error("goerliDir is undefined. Cannot proceed with the file operations.")
}
