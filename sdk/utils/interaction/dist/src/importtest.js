"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@account-abstraction/contracts");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const hardhat_1 = require("hardhat");
const types_1 = require("@account-abstraction/utils/dist/src/types");
const DeterministicDeployer_1 = require("../src/DeterministicDeployer");
const _1 = require(".");
const provider = hardhat_1.ethers.provider;
const signer = provider.getSigner();
let owner;
let entryPoint;
let beneficiary;
let recipient;
let accountAddress;
let accountDeployed = false;
async () => {
    entryPoint = await new contracts_1.EntryPoint__factory(signer).deploy();
    beneficiary = await signer.getAddress();
    recipient = await new types_1.SampleRecipient__factory(signer).deploy();
    owner = ethers_1.Wallet.createRandom();
    const factoryAddress = await DeterministicDeployer_1.DeterministicDeployer.deploy(contracts_1.SimpleAccountDeployer__factory.bytecode);
    const api = new _1.SimpleAccountAPI({
        provider,
        entryPointAddress: entryPoint.address,
        owner,
        factoryAddress
    });
    const Web3 = require('web3');
    const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
    var Tx = require('ethereumjs-tx').Transaction;
    const getUnsignedERC20AuthTx = (controllerAddress, erc20Addr, quantity, abiArray) => {
        let myContract = new web3.eth.Contract(abiArray, erc20Addr);
        let data = myContract.methods.transfer(controllerAddress, quantity).encodeABI();
        let rawTx = {
            "nonce": web3.utils.toHex(0x00),
            "gasPrice": "0x09184e72a000",
            "gasLimit": "0x2710",
            "to": erc20Addr,
            "value": 0,
            "data": data,
        };
        return rawTx;
    };
    const getSignedERC20AuthTx = (rawTx, privateKey) => {
        const tx = new Tx(rawTx);
        tx.sign(privateKey);
        let serializedTx = "0x" + tx.serialize().toString('hex');
    };
    const deployEthTx = (signedTx) => {
        web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash) {
        }).on('receipt', function (receipt) {
            console.log("receipt:" + receipt);
        });
    };
    const deployUserOp = async (userOp, accountApi) => {
        const EntryPointFactory = await hardhat_1.ethers.getContractFactory('EntryPoint');
        const entryPoint = await EntryPointFactory.deploy();
        const config = {
            entryPointAddress: entryPoint.address,
            bundlerUrl: 'http://localhost:3000/rpc'
        };
        const ownerAccount = ethers_1.Wallet.createRandom();
        const erc4337Provider = await (0, _1.wrapProvider)(hardhat_1.ethers.provider, 
        // new JsonRpcProvider('http://localhost:8545/'),
        config, ownerAccount);
        const net = await erc4337Provider.getNetwork();
        const rpcClient = new _1.HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId);
        try {
            const userOpHash = await rpcClient.sendUserOpToBundler(userOp);
            const txid = await accountApi.getUserOpReceipt(userOpHash);
            // console.log('reqId', userOpHash, 'txid=', txid)
        }
        catch (e) {
            console.log(e);
        }
    };
    const userOpHash = await rpcClient.sendUserOpToBundler(userOp);
    const txid = await api.getUserOpReceipt(userOpHash);
    const contractAbi = [];
    const controllerAddr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"; // oour controller address
    const erc20Addr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"; // address of their token
    const unsignedAuthTx = getUnsignedERC20AuthTx(controllerAddr, erc20Addr, 10.0, contractAbi);
    const authTxSignature = "."; // TODO
    const signedAuthTx = getSignedERC20AuthTx(unsignedAuthTx, authTxSignature);
    let amountToSend = (0, utils_1.parseEther)('.01');
    const providerURL = "";
    const unsignedUserOp = await api.getUnsignedUserOp(erc20Addr, amountToSend, 'http://127.0.0.1:8545');
    const userOpSignature = "."; // TODO
    const signedUserOp = api.getSignedUserOp(unsignedUserOp, userOpSignature);
    const walletSpec = getWalletSpec("Aave");
    deployEthTx(signedAuthTx);
    deployWallet(walletSpec);
    deployUserOp(signedUserOp, api);
    notifyBundlerOfEvent(userOpSignature);
};
//# sourceMappingURL=importtest.js.map