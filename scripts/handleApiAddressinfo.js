import fs from "fs"
import path from "path"

const loadAddressesFromAbis = (chainId) => {
    const abisDir = path.resolve(__dirname, "src", "abis")
    let fileNames = []

    try {
        fileNames = fs.readdirSync(abisDir)
    } catch (err) {
        console.error(`Error reading directory ${abisDir}: ${err}`)
        return {}
    }

    const addresses = {}

    for (const fileName of fileNames) {
        const filePath = path.join(abisDir, fileName)
        let fileContent = ""

        try {
            fileContent = fs.readFileSync(filePath, "utf8")
        } catch (err) {
            console.error(`Error reading file ${filePath}: ${err}`)
            continue
        }

        let jsonContent

        try {
            jsonContent = JSON.parse(fileContent)
        } catch (err) {
            console.error(`Error parsing JSON content from ${filePath}: ${err}`)
            continue
        }

        if (jsonContent.addresses && jsonContent.addresses[chainId]) {
            addresses[jsonContent.name] = jsonContent.addresses[chainId]
        }
    }
    return addresses
}

console.log(JSON.stringify(loadAddressesFromAbis(1)))
