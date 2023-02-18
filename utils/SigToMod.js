const testFolder = './abis/';
const fs = require('fs');


const out = {}
const getFunctionSigToMethodMapping = ({ abi, contractName }) => {
    const iface = new ethers.utils.Interface(abi)
    const functions = Object.keys(iface.functions)

    const selectors = functions.map((fullMethod) => {
        const method = fullMethod.split("(")[0]
        const sig = iface.getSighash(method)
        out[sig] = {
            module: contractName,
            method,
            sig
        }
    })
}


const create = () => {
    fs.readdirSync(testFolder).forEach(file => {
        const data = require(testFolder + file)
        getFunctionSigToMethodMapping(data)

    });

    fs.writeFileSync("./out.json", JSON.stringify(out))
}