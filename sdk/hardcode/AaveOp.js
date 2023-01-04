const ethers = require('ethers')
const { Contract, Signer, Wallet } = ethers

const { ERC4337EthersProvider, ERC4337EthersSigner, ClientConfig, wrapProvider, HttpRpcClient, SimpleAccountAPI, DeterministicDeployer } = require('@account-abstraction/sdk')
const contracts = require('@account-abstraction/contracts')
const { SimpleAccount__factory } = contracts.factories
const { parseEther } = require('ethers/lib/utils')


const { TreasuryAPI } = require("./treasuryapi")

const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi
const treasuryfactbytecode = require("../../web3/build/contracts/TreasuryFactory.json").bytecode
const actionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi

const url = "http://localhost:8545"

const provider = new ethers.providers.JsonRpcProvider(url);

const Web3 = require('web3')
const web3 = new Web3(url);
const entryPointAddress = "0x1306b01bC3e4AD202612D3843387e94737673F53"
const main = async () => {

    const aaveActionAddr = "0xE1CB2DbaB6b6feFe34B2AaA47b83EeE79E8D36f8"
    const aavactioncontract = await new web3.eth.Contract(actionContract, aaveActionAddr);

    const getTestData = async () => {
        const data = await aavactioncontract.methods.requests(key).call()
        // const out = web3.eth.abi.decodeParameters(["address", "address", "uint256", "string"], data)
        console.log(data)

    }



    const config = {
        entryPointAddress,
        bundlerUrl: 'http://localhost:3000/rpc'
    }



    // use this as signer (instead of node's first account)

    const ownerAccount = new ethers.Wallet(privateKey = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
    const erc4337Provider = await wrapProvider(
        provider,
        // new JsonRpcProvider('http://localhost:8545/'),
        config,
        ownerAccount
    )
    const erc4337Signer = erc4337Provider.getSigner();
    const simpleAccountPhantomAddress = await erc4337Signer.getAddress()

    // console.log(erc4337Provider)
    // erc4337Signer = erc4337Provider.getSigner()
    // const simpleAccountPhantomAddress = await erc4337Signer.getAddress()
    let addr = "0xB1d3BD3E33ec9A3A15C364C441D023a73f1729F6"
    let accountOwner = new Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
    await DeterministicDeployer.init(provider)
    const factoryAddress = "0xBAb8e13DeF75a95321E9f48d3ec57f2c0141A6c3"

    const net = await erc4337Provider.getNetwork()
    const accs = await web3.eth.getAccounts()



    const rpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId)

    let amount = parseEther('1') // amount

    const accountApi = new TreasuryAPI({
        provider: erc4337Provider,
        entryPointAddress: config.entryPointAddress,  //check this
        owner: accountOwner,
        factoryAddress
    })

    const accountAddress = await accountApi.getAccountAddress()
    // console.log(accountAddress)


    await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") })

    // let contract = new web3.eth.Contract(simpleAccountABI);  //get from simpleaccount
    // let data = contract.methods.transfer(addr, amount).encodeABI();

    //   function transfer(address payable dest, uint256 amount) external onlyOwner {
    //     dest.transfer(amount);
    // }


    const key = "key1"
    const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', key]);
    // const aavedata2 = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', "key2"]);
    const aavecall = aavactioncontract.methods.init(aavedata)
    // const aavecall2 = aavactioncontract.methods.init(aavedata2)

    // await web3.eth.sendTransaction({ to: aaveActionAddr, from: accs[0], data: aavecall2.encodeABI() })



    try {
        const op = await accountApi.createSignedUserOp({
            target: aaveActionAddr,
            data: aavecall.encodeABI()
        })
        const userOpHash = await rpcClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)

        const receipt = await rpcClient.userOpJsonRpcProvider
            .send('eth_getUserOperationReceipt', [userOpHash]);
        console.log('reqId', userOpHash, 'txid=', txid)
        console.log(receipt)
    } catch (e) {
        // console.log(e.error)
    }

    await getTestData(key, accountAddress)

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
main()

