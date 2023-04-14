const Web3 = require('web3');
const fetch = require('node-fetch');
const erc20 = require('./abis/ERC20.json')
const ethers = require('ethers');
const { Eoa } = require('./auth');
const { FunWallet } = require('./wallet');
const { configureEnvironment } = require('./managers');
const { genCall } = require('./actions');
const chainId = 137;
// const web3RpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/demo';
// const web3RpcUrl = "http://localhost:8545"
const web3RpcUrl = "https://polygon-rpc.com"

const walletAddress = '0x07Ac5A221e5b3263ad0E04aBa6076B795A91aef9';
const privateKey = '6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064';
const swapParams = {
    fromTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    toTokenAddress: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI 0x6B175474E89094C44Da98b954EedeAC495271d0F
    amount: '10000',
    fromAddress: walletAddress,
    slippage: 1,
    disableEstimate: false,
    allowPartialFill: false,
};

const broadcastApiUrl = 'https://tx-gateway.1inch.io/v1.1/' + chainId + '/broadcast';
const apiBaseUrl = 'https://api.1inch.io/v5.0/' + chainId;
const web3 = new Web3(web3RpcUrl);
const provider = new ethers.providers.JsonRpcProvider(web3RpcUrl);

function apiRequestUrl(methodName, queryParams) {
    return apiBaseUrl + methodName + '?' + (new URLSearchParams(queryParams)).toString();
}

async function broadCastRawTransaction(rawTransaction) {
    return fetch(broadcastApiUrl, {
        method: 'post',
        body: JSON.stringify({ rawTransaction }),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())
        .then(res => {
            return res.transactionHash;
        });
}
async function buildTxForApproveTradeWithRouter(tokenAddress, amount) {
    const url = apiRequestUrl(
        '/approve/transaction',
        amount ? { tokenAddress, amount } : { tokenAddress }
    );

    const transaction = await fetch(url).then(res => res.json());

    const gasLimit = await web3.eth.estimateGas({
        ...transaction,
        from: walletAddress
    });
    // // const gasPrice = await provider.estimateGas().bar()
    // console.log(gasLimit)
    // console.log(gasPrice)

    return {
        ...transaction,
        gas: gasLimit
    };
}


async function signAndSendTransaction(transaction) {
    // const wallet = new ethers.Wallet(privateKey, provider)
    // const tx= await wallet.sendTransaction(transaction)
    const { rawTransaction } = await web3.eth.accounts.signTransaction(transaction, privateKey);

    return await broadCastRawTransaction(rawTransaction);
    return tx
}

async function buildTxForSwap(swapParams) {
    const url = apiRequestUrl('/swap', swapParams);

    return fetch(url).then(res => res.json()).then(res => res.tx);
}
function checkAllowance(tokenAddress, walletAddress) {
    return fetch(apiRequestUrl('/approve/allowance', { tokenAddress, walletAddress }))
        .then(res => res.json())
        .then(res => res.allowance);
}

const main = async () => {
    const options = {
        chain: 137,
        apiKey: 'localtest',
        // gasSponsor: {
        //     sponsorAddress: SPONSOR_ADDRESS,
        //     token: "USDC",
        // },
    };
    configureEnvironment(options)
    const provider = new ethers.providers.JsonRpcProvider(web3RpcUrl);
    const eoa = new ethers.Wallet(privateKey, provider)
    const auth = new Eoa({ signer: eoa })

    const salt = await auth.getUniqueId()
    const wallet = new FunWallet({ salt, index: 23420 })
    const walletAddress = await wallet.getAddress()
    console.log('wallet address: ',walletAddress)
    const allowance = await checkAllowance(swapParams.fromTokenAddress, walletAddress);
    console.log('Allowance: ', allowance);

    const transactionForSign = await buildTxForApproveTradeWithRouter(swapParams.fromTokenAddress);
    console.log('Transaction for approve: ', transactionForSign);
    // const approveTxHash = await signAndSendTransaction(transactionForSign);
    // console.log('Approve tx hash: ', approveTxHash);

    // console.log(await wallet.create())
    const approveReceipt = await wallet.execute(auth, genCall(transactionForSign, 300_000 ))
    console.log(approveReceipt)

    const swapTransaction = await buildTxForSwap(swapParams);
    console.log('Transaction for swap: ', swapTransaction);

    const erc20Contract = new ethers.Contract("0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", erc20.abi, provider);
    const balance = await erc20Contract.balanceOf(walletAddress);
    console.log('balance before ', balance)
    await PromiseTimeout(20000);    

    const receipt = await wallet.execute(auth, genCall(swapTransaction, 3_000_000 ))
    console.log(receipt)

    // const swapTxHash = await wallet.sendTx({ auth, op })
    // const swapTxHash = await signAndSendTransaction(swapTransaction);
    // console.log('Swap transaction hash: ', swapTxHash);
    const balance2 = await erc20Contract.balanceOf(walletAddress);
    console.log('balance after ', balance2)

    // const tx = {
    //     from: '0x07Ac5A221e5b3263ad0E04aBa6076B795A91aef9',
    //     to: '0x1111111254eeb25477b68fb85ed929f73a960582',
    //     data: '0x0502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000db476b9c6802e170000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340aaf5110db6e744ff70fb339de037b990a20bdacecfee7c08',
    //     value: '0',
    //     gas: 148608,
    //     gasPrice: '21265858368'
    //   }
    // const swapTxHash = await signAndSendTransaction(tx);
    // console.log('Swap transaction hash: ', swapTxHash);
}
function PromiseTimeout(delayms) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, delayms);
    });
}
main()