"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@account-abstraction/contracts");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = require("hardhat");
const types_1 = require("@account-abstraction/utils/dist/src/types");
const src_1 = require("../src");
const { TreasuryFactory__factory } = require("../../hardcode/treasuryfactory");
const treasuryAbi = require("../../../web3/build/contracts/Treasury.json").abi;
const firebase = require('firebase');
const TreasuryAPI_1 = require("../src/TreasuryAPI");
const url = "http://localhost:8545";
const provider = new hardhat_1.ethers.providers.JsonRpcProvider(url);
const signer = provider.getSigner();
let owner;
let entryPoint;
let beneficiary;
let recipient;
let accountAddress;
let accountDeployed = false;
let api;
const Web3 = require('web3');
let web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
var Tx = require('ethereumjs-tx').Transaction;
let config;
const entryPointAddress = "0x1306b01bC3e4AD202612D3843387e94737673F53";
const factoryAddress = "";
describe('Immuna Test', () => {
    before('initialize', async () => {
        config = {
            entryPointAddress: entryPointAddress,
            bundlerUrl: 'http://localhost:3000/rpc'
        };
        entryPoint = await new contracts_1.EntryPoint__factory(signer).deploy();
        beneficiary = await signer.getAddress();
        recipient = await new types_1.SampleRecipient__factory(signer).deploy();
        owner = ethers_1.Wallet.createRandom();
        // const factoryAddress = await DeterministicDeployer.deploy(SimpleAccountDeployer__factory.bytecode)
        api = new src_1.SimpleAccountAPI({
            provider,
            entryPointAddress: entryPoint.address,
            owner,
            factoryAddress
        });
        console.log(api);
    });
    const getUnsignedERC20AuthTx = async (from, controllerAddress, erc20Addr, amount, type) => {
        if (type === 'aave') {
            let minABI = [
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_to",
                            "type": "address"
                        },
                        {
                            "name": "_value",
                            "type": "uint256"
                        }
                    ],
                    "name": "transfer",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "type": "function"
                }
            ];
            let myContract = new web3.eth.Contract(minABI, erc20Addr);
            amount = web3.utils.toHex(amount); //check
            let nonce = await web3.getTransactionCount(from);
            let tx = {
                'from': from,
                'gasPrice': web3.utils.toHex(20 * 1e9),
                'gasLimit': web3.utils.toHex(210000),
                'to': erc20Addr,
                'value': 0x0,
                'data': myContract.methods.transfer(controllerAddress, amount).encodeABI(),
                'nonce': web3.utils.toHex(nonce)
            };
            return tx;
        }
        else if (type === 'uniswap') {
        }
        else {
            throw new Error('unsupported token');
            return {};
        }
    };
    const getSignedERC20AuthTx = (rawTx, privateKey) => {
        const tx = new Tx(rawTx);
        tx.sign(privateKey);
        let serializedTx = "0x" + tx.serialize().toString('hex');
        return serializedTx;
    };
    const deployEthTx = (signedTx) => {
        web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash) {
        }).on('receipt', function (receipt) {
            console.log("receipt:" + receipt);
        });
    };
    const getUnsignedUserOp = async (api, type, amount, providerURL) => {
        let op = await api.getUnsignedUserOp('aave', amount, 'http://127.0.0.1:8545');
        return op;
    };
    const getSignedUserOp = async (api, unsignedUserOp, signature) => {
        let op = await api.getSignedUserOp(unsignedUserOp, signature);
        return op;
    };
    const executeUserOp = async (userOp) => {
        const EntryPointFactory = await hardhat_1.ethers.getContractFactory('EntryPoint');
        const entryPoint = await EntryPointFactory.deploy();
        const config = {
            entryPointAddress: entryPoint.address,
            bundlerUrl: 'http://localhost:3000/rpc'
        };
        const ownerAccount = ethers_1.Wallet.createRandom();
        const erc4337Provider = await (0, src_1.wrapProvider)(hardhat_1.ethers.provider, 
        // new JsonRpcProvider('http://localhost:8545/'),
        config, ownerAccount);
        const net = await erc4337Provider.getNetwork();
        const rpcClient = new src_1.HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId);
        try {
            const userOpHash = await rpcClient.sendUserOpToBundler(userOp);
            return true;
            // console.log('reqId', userOpHash, 'txid=', txid)
        }
        catch (e) {
            console.log(e);
            return false;
        }
    };
    const deployWallet = async (wallet) => {
        const EntryPointFactory = await hardhat_1.ethers.getContractFactory('EntryPoint');
        const entryPoint = await EntryPointFactory.deploy();
        const ownerAccount = ethers_1.Wallet.createRandom();
        const erc4337Provider = await (0, src_1.wrapProvider)(hardhat_1.ethers.provider, 
        // new JsonRpcProvider('http://localhost:8545/'),
        config, ownerAccount);
        const net = await erc4337Provider.getNetwork();
        const rpcClient = new src_1.HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId);
        try {
            const userOpHash = await rpcClient.sendUserOpToBundler(wallet);
            return true;
            // console.log('reqId', userOpHash, 'txid=', txid)
        }
        catch (e) {
            console.log(e);
            return false;
        }
    };
    const getWalletSpec = async (type) => {
        const entryPointAddress = "0x1306b01bC3e4AD202612D3843387e94737673F53";
        const ownerAccount = new hardhat_1.ethers.Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356");
        let accountOwner = new ethers_1.Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356");
        const factoryAddress = "0x9323d71E54CFFE145Ae15Ad711a5aD52255A7866";
        let amount = (0, utils_1.parseEther)('1'); // amount
        const accs = await web3.eth.getAccounts();
        const erc4337Provider = await (0, src_1.wrapProvider)(provider, 
        // new JsonRpcProvider('http://localhost:8545/'),
        config, ownerAccount);
        const erc4337Signer = erc4337Provider.getSigner();
        const accountApi = new TreasuryAPI_1.TreasuryAPI({
            provider: erc4337Provider,
            entryPointAddress: config.entryPointAddress,
            owner: accountOwner,
            factoryAddress
        });
        let addr = accountApi.getAddressFromType(type);
        const accountAddress = await accountApi.getAccountAddress();
        await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") });
        // let contract = new web3.eth.Contract(simpleAccountABI);  //get from simpleaccount
        // let data = contract.methods.transfer(addr, amount).encodeABI();
        //   function transfer(address payable dest, uint256 amount) external onlyOwner {
        //     dest.transfer(amount);
        // }
        const aaveActionAddr = "0x76ca03a67C049477FfB09694dFeF00416dB69746";
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
        }, [aavedata]);
        const recipient = new hardhat_1.ethers.Contract("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", treasuryAbi, erc4337Signer);
        const op = await accountApi.createSignedUserOp({
            target: recipient.address,
            data: recipient.interface.encodeFunctionData('callOp', [aaveActionAddr, 0, aavecall]),
        });
        op.initCode = "1";
        return op;
    };
    const storeUserOp = (userOp) => {
    };
    it('ercTxTest', () => {
        const from = '0xffff'; //eoa address
        const controllerAddr = "0xffffffffffffffffffffffffffffffff"; // oour controller address
        const erc20Addr = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"; // address of their token staked aave?
        const unsignedAuthTx = getUnsignedERC20AuthTx(from, controllerAddr, erc20Addr, 1, 'aave');
        const authTxSignature = "."; // get from user
        const signedAuthTx = getSignedERC20AuthTx(unsignedAuthTx, authTxSignature);
        deployEthTx(signedAuthTx);
    });
    it('userOpDeployTest', async () => {
        let amountToSend = (0, utils_1.parseEther)('.01');
        const unsignedUserOp = await getUnsignedUserOp(api, 'aave', amountToSend, 'http://127.0.0.1:8545');
        const userOpSignature = "."; // TODO
        const signedUserOp = await getSignedUserOp(api, unsignedUserOp, userOpSignature);
        storeUserOp(signedUserOp);
        executeUserOp(signedUserOp);
    });
    it('deployWalletTest', async () => {
        const walletSpec = await getWalletSpec("Aave");
        deployWallet(walletSpec);
    });
    // it('test', async () => {
    // const contractAbi: any[] = []
    // const controllerAddr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // oour controller address
    // const erc20Addr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // address of their token
    // const authTxSignature = "." // TODO
    // const signedAuthTx = getSignedERC20AuthTx(unsignedAuthTx, authTxSignature)
    // const providerURL = ""
    // const unsignedUserOp = await api.getUnsignedUserOp(
    //     'aave',
    //     amountToSend,
    //     'http://127.0.0.1:8545'
    // )
    // notifyBundlerOfEvent(userOpSignature)
    // })
});
// const getWalletSpec = async (type: string): Promise<UserOperationStruct> => {
//     entryPoint = await new EntryPoint__factory(signer).deploy()
//     beneficiary = await signer.getAddress()
//     recipient = await new SampleRecipient__factory(signer).deploy()
//     owner = Wallet.createRandom()
//     const factoryAddress = await DeterministicDeployer.deploy(TreasuryFactory__factory.bytecode)
//     //create userop
//     let wallet:any;
//     if (type === 'aave' || type==='uniswap') {
//         wallet=new TreasuryAPI({
//             provider,
//         entryPointAddress: entryPoint.address,
//         owner,
//         factoryAddress
//         })
//     }
//     else {
//         throw new Error(`${type} of wallet is not available`)
//         return null
//     }
//     const unsignedUserOp = await wallet.encode({
//         type,
//         amountToSend,
//         'http://127.0.0.1:8545'
//     })
//     return unsignedUserOp
// }
//# sourceMappingURL=ImmunaTest.test.js.map