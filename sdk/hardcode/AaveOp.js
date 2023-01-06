require('dotenv').config();

const ethers = require('ethers')
const { createHash } = require("crypto")
const { HttpRpcClient, DeterministicDeployer, ERC4337EthersProvider } = require('@account-abstraction/sdk')
const { wrapProvider } = require("./Provider")
const { TreasuryAPI } = require("./treasuryapi")
const Tx = require('@ethereumjs/tx').Transaction;

const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi
const treasuryfactbytecode = require("../../web3/build/contracts/TreasuryFactory.json").bytecode
const actionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi
const entrypointcontract = require("../../web3/build/contracts/EntryPoint.json")
const ATokenContract = require("../../web3/build/contracts/AToken.json").abi

const url = "http://127.0.0.1:8545"

const ownerAccount = new ethers.Wallet("0x30b0731fb56a957fbf877da89fe40f59fadfdf86fed10f4c9eb158922e2518d4")
const userWallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
const key = "key"

const url = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const bundlerUrl = "http://localhost:3000/rpc"

// const url = "http://127.0.0.1:8545"
// const bundlerUrl = "http://localhost:3000/rpc"
const provider = new ethers.providers.JsonRpcProvider(url);


const Web3 = require('web3');
const { clear } = require('console');
const web3 = new Web3(url);

const entryPointAddress = "0xCf64E11cd6A6499FD6d729986056F5cA7348349D"
// const entryPointAddress = "0x1306b01bc3e4ad202612d3843387e94737673f53"


const factoryAddress = "0x8e1519ad51625F5B934166D5D1ea468ab72aF7e1"
const aaveActionAddr = "0x0f2586f441EA14384E0133Eb0D04258E0111D701"

const main = async () => {
    const aavactioncontract = await new web3.eth.Contract(actionContract, aaveActionAddr);

    const getTestData = async (key) => {
        const data = await aavactioncontract.methods.requests(key).call()
        // const out = web3.eth.abi.decodeParameters(["address", "address", "uint256", "string"], data)
        console.log(data)

    }

    const sendTestOP = async (addr, calldata) => {
        const accs = await web3.eth.getAccounts()
        await web3.eth.sendTransaction({ to: addr, from: accs[0], data: calldata })
        await getTestData()

    }

    const config = {
        entryPointAddress,
        bundlerUrl
    }

    // use this as signer (instead of node's first account)


    const erc4337Provider = await wrapProvider(
        provider,
        config,
        ownerAccount,
        factoryAddress
    )

    const net = await erc4337Provider.getNetwork()
    const rpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId)

    const accountApi = new TreasuryAPI({
        provider: erc4337Provider,
        entryPointAddress: config.entryPointAddress,  //check this
        owner: ownerAccount,
        factoryAddress,
    })

    const accountAddress = await accountApi.getAccountAddress()
    // await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") })

    const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', key]);
    const aavecall = aavactioncontract.methods.init(aavedata)
    // const aavedata2 = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', "key2"]);
    // const aavecall2 = aavactioncontract.methods.init(aavedata2)
    // await web3.eth.sendTransaction({ to: aaveActionAddr, from: accs[0], data: aavecall2.encodeABI() })


    const baseWallet = userWallet.connect(provider)

    //fund wallet
    // await baseWallet.sendTransaction({ to: entryPointAddress, value: ethers.utils.parseEther(".3") })

    try {
        const op = await accountApi.createSignedUserOp({
            target: aaveActionAddr,
            data: aavecall.encodeABI()
        })

        // await sendTestOP(accountAddress, encodeCallOp(aaveActionAddr, aavecall.encodeABI()))
        // await sendTestOP(aaveActionAddr, aavecall.encodeABI())
        const userOpHash = await rpcClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        // const receipt = await rpcClient.userOpJsonRpcProvider
        //     .send('eth_getUserOperationReceipt', [userOpHash]);
        console.log('reqId', userOpHash, 'txid=', txid)
        // console.log(JSON.stringify(receipt))
    } catch (e) {
        console.log(e.error)
    }


}

const encodeCallOp = (addr, data, value = "0") => {
    return web3.eth.abi.encodeFunctionCall({
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "callOp",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }, [addr, value, data])
}



class FunWallet {
    MAX_INT = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    sha256(content) {
        return createHash('sha256').update(content).digest('hex')
    }

    constructor(rpcURL, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcURL);
        this.ownerAccount = ownerAccount.connect(provider)
        this.provider = this.ownerAccount.provider
        this.config = { bundlerUrl, entryPointAddress }
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
        this.factoryAddress = factoryAddress
    }
    async init() {
        const net = await this.provider.getNetwork()
        this.rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, net.chainId)
        this.erc4337Provider = await wrapProvider(this.provider, this.config, this.ownerAccount, this.factoryAddress)

        this.accountApi = new TreasuryAPI({
            provider: this.erc4337Provider,
            entryPointAddress: this.entryPointAddress,  //check this
            owner: this.ownerAccount,
            factoryAddress: this.factoryAddress,
            index: 3
        })

        this.accountAddress = await this.accountApi.getAccountAddress()
        // this.ownerAccount.sendTransaction({ to: this.accountAddress, value: ethers.utils.parseEther(".3") })
        return this.accountAddress
    }

    async sendOpToBundler(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    static async getATokenAddress(poolAddr, underlyingAsset) {
        const poolABI = require("../../web3/build/contracts/IPool.json").abi
        const poolContract = new web3.eth.Contract(poolABI, poolAddr)
        const { aTokenAddress } = await poolContract.methods.getReserveData(underlyingAsset).call()
        return aTokenAddress
    }

    async getPreAAVEtransactions(aTokenAddr, amount = this.MAX_INT) {
        const atokenContract = new web3.eth.Contract(ATokenContract);

        let rawTransaction = {
            data: atokenContract.methods.approve(this.accountAddress, amount).encodeABI(),
            to: aTokenAddr
        }
        return rawTransaction
    }

    async createPermitSignature(owner, spender, tokenId, contract, library) {
        try {
            const transactionDeadline = Date.now() + 2000000 * 60 * 60;
            const nonce = await contract.nonces(owner);
            const contractName = await contract.name();
            const EIP712Domain = [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
            ];
            const domain = {
                name: contractName,
                version: "1",
                chainId: library.network.chainId,
                verifyingContract: contract.address,
            };
            const Permit = [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "tokenId", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ];
            const message = {
                owner,
                spender,
                tokenId,
                nonce: nonce.toHexString(),
                deadline: transactionDeadline,
            };
            const data = JSON.stringify({
                types: {
                    EIP712Domain,
                    Permit,
                },
                domain,
                primaryType: "Permit",
                message,
            });

            const signature = await this.provider.send("eth_signTypedData_v4", [owner, data]);
            const signData = utils.splitSignature(signature);
            const { r, s, v } = signData;
            return {
                r,
                s,
                v,
                deadline: transactionDeadline,
            };
        } catch (e) {
            // throw Error(`${e}`);
        }

    }

    async getPreUNItransactions(ownerWallet, tokenId) {
        const uniContract = new ethers.Contract(uniNFTABI)
        const sig = createPermitSignature(ownerWallet, this.accountAddress, tokenId, uniContract,)
        return rawTransaction
    }

    async createAAVETrackingPosition(actionAddr, userAddr, aTokenAddr, positionMax, storageKey = "") {
        const aavactioncontract = await new web3.eth.Contract(actionContract);
        const hashinput = [userAddr, aTokenAddr, positionMax, storageKey].toString()
        const key = this.sha256(hashinput)
        const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], [userAddr, aTokenAddr, positionMax, key]);
        const aavecall = aavactioncontract.methods.init(aavedata)
        const op = await this.accountApi.createSignedUserOp({
            target: actionAddr,
            data: aavecall.encodeABI()
        })
        return { op, key }
    }

    async executeAAVETrackingPosition(actionAddr, storageKey) {
        const aavactioncontract = await new web3.eth.Contract(actionContract);
        const aavedata = web3.eth.abi.encodeParameters(["string"], [storageKey]);
        const aavecall = aavactioncontract.methods.execute(aavedata)
        const op = await this.accountApi.createSignedUserOp({
            target: actionAddr,
            data: aavecall.encodeABI()
        })
        return { op }
    }
}


const aaveCreateTest = async (wallet, userAddr, aTokenAddr, positionMax) => {
    //create and send user op
    let { op, key } = await wallet.createAAVETrackingPosition(aaveActionAddr, userAddr, aTokenAddr, positionMax)
    const receipt = await wallet.sendOpToBundler(op)
    console.log(receipt)
    return key
}

const aaveExecuteTest = async (wallet, key) => {
    let { op } = await wallet.executeAAVETrackingPosition(aaveActionAddr, key)
    const receipt = await wallet.sendOpToBundler(op)
    return receipt
}

const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}
const aaveTest = async () => {
    // initialize wallet
    const wallet = new FunWallet(url, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress)
    const address = await wallet.init()
    const baseWallet = userWallet.connect(provider)
    //fund wallet
    await baseWallet.sendTransaction({ to: address, value: ethers.utils.parseEther(".3") })

    // create and send user op

    const userAddr = baseWallet.address;
    const poolAddr = "0xb47673b7a73D78743AFF1487AF69dBB5763F00cA"; //Pool-Proxy-Aave
    const assetAddr = "0x407287b03D1167593AF113d32093942be13A535f"; // WAVAX
    const positionMax = wallet.MAX_INT
    // const aTokenAddr = "0xC50E6F9E8e6CAd53c42ddCB7A42d616d7420fd3e"
    const aTokenAddr = await FunWallet.getATokenAddress(poolAddr, assetAddr)

    const atokenContract = new web3.eth.Contract(ATokenContract, aTokenAddr);

    const preBalance = await atokenContract.methods.balanceOf(userAddr).call()

    // // Pre-Transaction Verification/Approval
    const rawTransaction = await wallet.getPreAAVEtransactions(aTokenAddr, positionMax)
    console.log(rawTransaction)
    // const rc = await baseWallet.sendTransaction(rawTransaction)
    // console.log(rc)
    const preBalanceAllowance = await atokenContract.methods.allowance(userAddr, address).call()

    const key = await aaveCreateTest(wallet, userAddr, aTokenAddr, positionMax)
    console.log("waiting")
    await timeout(5000)
    const rec = await aaveExecuteTest(wallet, key)
    console.log(rec)
    const postBalance = await atokenContract.methods.balanceOf(userAddr).call()
    console.log(preBalance, preBalanceAllowance, postBalance)
}
aaveTest().catch(console.log)
// aaveTest()
// steps for goerli
// 