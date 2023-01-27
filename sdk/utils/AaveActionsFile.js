const ethers = require("ethers")

const { createMultipleWrappedContracts } = require("./WrappedEthersContract")
const pooldata = require("./abis/IPool.json")
const ercdata = require("./abis/ERC20.json")

const pkey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const provider = new ethers.providers.JsonRpcProvider(rpc)
const wallet = new ethers.Wallet(privateKey = pkey, provider)

const main = async () => {
    const { chainId } = await provider.getNetwork()
    const useraddr = await wallet.getAddress()

    const assetAddr = "0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3" // Avax aave dai not adai
    const poolAddr = "0xb47673b7a73D78743AFF1487AF69dBB5763F00cA" // Pool-Proxy-AVAX

    const data = [
        {
            addr: poolAddr,
            abi: pooldata.abi
        },
        {
            addr: assetAddr,
            abi: ercdata.abi,
        }
    ]
    const [poolContract, tokenContract] = createMultipleWrappedContracts(data, wallet, provider, chainId)

    const userBalance = await tokenContract.callMethod("balanceOf", [useraddr])

    console.log("User Balance: ", userBalance)



    const approvalTx = await tokenContract.createUnsignedTransaction("approve", [poolAddr, userBalance])
    console.log(approvalTx)
    const submittedApprovalTx = await wallet.sendTransaction(approvalTx);
    const approveReceipt = await submittedApprovalTx.wait()
    console.log(approveReceipt)

    const allowance = await tokenContract.callMethod("allowance", [useraddr, poolAddr])
    console.log("Pool Allowance: ", allowance)


   
}


main()