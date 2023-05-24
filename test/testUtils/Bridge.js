const BridgeTest = (config) => {
    const { chainId, bridgePrivateKey, outToken, baseToken, prefund } = config
    const { assert } = require("chai")
    const { ethers, Wallet } = require("ethers")
    const { Token } = require("../../data")
    const { Eoa } = require("../../auth")
    const { configureEnvironment } = require("../../managers")
    const { fundWallet, getTestApiKey } = require("../../utils")
    const { FunWallet } = require("../../wallet")
    const erc20Abi = require("../../abis/ERC20.json").abi

    describe("Bridge - if tests failing, set prefund = true in test/polygon/Bridge.js", function () {
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
            const fromChain = 137;
            const toChain = 56;
            const fromAssetAddress = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
            const toAssetAddress = "0x55d398326f99059fF775485246999027B3197955";
            const amount = 1; // 100 USDC, USDC is 6 decimals

            const walletAddress = await wallet.getAddress()
            // send usdc to funwallet
            const provider = await ethers.getDefaultProvider('https://polygon.llamarpc.com');
            const signer = new Wallet(bridgePrivateKey, provider);
            const usdcContract = new ethers.Contract(fromAssetAddress, erc20Abi, signer);
            const gasPrice = await signer.getGasPrice();
            let tx = await usdcContract.transfer(walletAddress, amount, { gasPrice: gasPrice })
            const tokenBalanceBefore = (await Token.getBalance("usdc", walletAddress))
            const receipt = await tx.wait()

            const res = await wallet.bridge(auth, { fromChain, toChain, fromAssetAddress, toAssetAddress, amount, sort: "output" })
            const tokenBalanceAfter = (await Token.getBalance("usdc", walletAddress))
            assert(tokenBalanceAfter < tokenBalanceBefore, "Token balance did not decrease")
            assert(res.txid !== null, "Transaction failed as txid was null")
        })

    })
}
module.exports = { BridgeTest }