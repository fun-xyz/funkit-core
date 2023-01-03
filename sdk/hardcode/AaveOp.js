const ethers = require('ethers')
const { Contract, Signer, Wallet } = ethers

const { ERC4337EthersProvider, ERC4337EthersSigner, ClientConfig, wrapProvider, HttpRpcClient, SimpleAccountAPI, DeterministicDeployer } = require('@account-abstraction/sdk')
const contracts = require('@account-abstraction/contracts')
const { SimpleAccount__factory } = contracts.factories
const { parseEther } = require('ethers/lib/utils')


const { TreasuryAPI } = require("./treasuryapi")

const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi
const treasuryfactbytecode = require("../../web3/build/contracts/TreasuryFactory.json").bytecode

const url = "http://localhost:8545"

const provider = new ethers.providers.JsonRpcProvider(url);

const Web3 = require('web3')
const web3 = new Web3(url);
const entryPointAddress = "0x1306b01bC3e4AD202612D3843387e94737673F53"
const main = async () => {
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
    const factoryAddress = "0x9323d71E54CFFE145Ae15Ad711a5aD52255A7866"
    const address = await accountOwner.getAddress()


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


    await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") })

    // let contract = new web3.eth.Contract(simpleAccountABI);  //get from simpleaccount
    // let data = contract.methods.transfer(addr, amount).encodeABI();

    //   function transfer(address payable dest, uint256 amount) external onlyOwner {
    //     dest.transfer(amount);
    // }
    const aaveActionAddr = "0x76ca03a67C049477FfB09694dFeF00416dB69746"

    const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', 'key1']);
    const aavecall = web3.eth.abi.encodeFunctionCall({
        "inputs": [
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "init",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    }, [aavedata])

    const recipient = new ethers.Contract("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", treasuryAbi, erc4337Signer)

    let data = web3.eth.abi.encodeFunctionCall({
        name: 'transfer',
        type: 'function',
        inputs: [
            {
                type: 'address',
                name: 'dest'
            }, {

                type: 'uint256',
                name: 'amount'
            }]
    }, [addr, amount]);

    const op = await accountApi.createSignedUserOp({
        target: recipient.address,
        data: recipient.interface.encodeFunctionData('callOp', [aaveActionAddr, 0, aavecall])
    })

    console.log(op)

    try {
        const userOpHash = await rpcClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        console.log('reqId', userOpHash, 'txid=', txid)
    } catch (e) {
        console.log(e.error)
    }

}

main()