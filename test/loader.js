const fs = require("fs");

const loadAbis = () => {
    const entryPointPath = "eip-4337/EntryPoint.sol/EntryPoint.json"
    const authContractPath = "validations/UserAuthentication.sol/UserAuthentication.json"
    const approveAndSwapPath = "modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json"
    const aaveWithdrawPath = "modules/actions/AaveWithdraw.sol/AaveWithdraw.json"
    const factoryPath = "deployer/FunWalletFactory.sol/FunWalletFactory.json"
    const walletPath = "FunWallet.sol/FunWallet.json"
    const tokenPaymasterpath = "paymaster/TokenPaymaster.sol/TokenPaymaster.json"
    const tokenOracle = "paymaster/TokenPriceOracle.sol/TokenPriceOracle.json"
    const abis = [entryPointPath, authContractPath, approveAndSwapPath, factoryPath, walletPath, tokenPaymasterpath, tokenOracle, aaveWithdrawPath]
    abis.forEach(moveFile)
}

const moveFile = (path) => {
    const dirs = Array.from(path.split("/"))
    const fileName = dirs.at(-1)
    const newPath = `./abis/${fileName}`
    const basePath = "../../fun-wallet-smart-contract/artifacts/contracts/"
    try {
        const data = require(basePath + path)
        fs.writeFileSync(newPath, JSON.stringify(data))
        console.log("SUCCESS: ", fileName)
    }
    catch (e) {
        console.log(e)
        console.log("ERROR: ", fileName)
    }
}

if (typeof require !== 'undefined' && require.main === module) {
    loadAbis()
}