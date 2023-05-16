const BridgeTest = (config) => {
    const { chainId, bridgePrivateKey, outToken, baseToken, prefund } = config
    const { assert } = require("chai")
    const { ethers, Wallet } = require("ethers")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { fundWallet, getTestApiKey } = require("../../utils")
    const { FunWallet } = require("../../wallet")
    const erc20Abi = require("../../abis/ERC20.json").abi


    describe("Bridge", function () {
        this.timeout(120_000_000_000)
        let auth
        let wallet
        const amount = 1
        before(async function () {
            let apiKey = await getTestApiKey()
            const options = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: null
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: bridgePrivateKey })
            uniqueId = await auth.getUniqueId()
            wallet = new FunWallet({ uniqueId, index: 1792811340 })
            if (prefund)
                await fundWallet(auth, wallet, amount)
        })

        it("Bridge .000001 USDC from Polygon to BSC", async () => {
            const fromChainId = 137;
            const toChainId = 56;
            const fromAssetAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
            const toAssetAddress = "0x55d398326f99059fF775485246999027B3197955";
            const amount = 10; // 100 USDC, USDC is 6 decimals

            const walletAddress = await wallet.getAddress()
            // send usdc to funwallet
            const provider = await ethers.getDefaultProvider('https://polygon.llamarpc.com');
            const signer = new Wallet(bridgePrivateKey, provider);
            const usdcContract = new ethers.Contract(fromAssetAddress, erc20Abi, signer);
            const gasPrice = await signer.getGasPrice();
            console.log("Polygon Gas Price: ", gasPrice);
            let tx = await usdcContract.connect(signer).transfer(walletAddress, amount, { gasPrice: gasPrice })
            const receipt = await tx.wait()
            console.log(receipt)

            const res = await wallet.bridge(auth, { fromChainId, toChainId, fromAssetAddress, toAssetAddress, amount })
            console.log("--------------------- Res ---------------------")
            console.log(res)
        })

    })
}
module.exports = { BridgeTest }