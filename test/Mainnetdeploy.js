const { ethers } = require('ethers');
const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default;
const Eth = require('@ledgerhq/hw-app-eth').default;
const { ledgerService } = require('@ledgerhq/hw-app-eth');
const entryPoint = require("../abis/EntryPoint.json");
const Tx = require('ethereumjs-tx').Transaction;
const { Buffer } = require('buffer');

const main = async () => {
    // Define the transaction parameters
    const transaction = {
        to: null,
        value: 0, // Set to 0 for contract deployment
        gasLimit: 2000000, // Replace with the gas limit for the transaction
        gasPrice: 200000000000, // Replace with the gas price you want to use
        data: entryPoint.bytecode, // Replace with the compiled contract bytecode
        nonce: 0
    };

    // Define the network and provider
    const alchemyRpcUrl = 'https://polygon-mainnet.g.alchemy.com/v2/mrmUEO1nzh1wX9J9jcpeW4JBzVjLj6_Z';
    const provider = new ethers.providers.JsonRpcProvider(alchemyRpcUrl);

    // Connect to the Ledger device
    const transport = await TransportNodeHid.create();
    const eth = new Eth(transport);

    // Get the current nonce for the signer's address
    const address = await eth.getAddress("44'/60'/0'/0/0").then(o => o.address)

    const nonce = await provider.getTransactionCount(address);

    // Set the nonce in the transaction
    transaction.nonce = nonce;

    // Sign the transaction
    // Create a new instance of the Transaction class
    const txObject = new Tx(transaction);

    // Serialize the transaction
    const tx = txObject.serialize().toString('hex');

    const resolution = await ledgerService.resolveTransaction(tx, {}, {});

    const signedTransaction = await eth.signTransaction(
        "m/44'/60'/0'/0/0",
        tx,
        resolution
    );

    // Send the signed transaction
    const transactionResponse = await provider.sendTransaction(signedTransaction);

    console.log('Transaction hash:', transactionResponse.hash);

    // Wait for the transaction to be confirmed
    const receipt = await provider.waitForTransaction(transactionResponse.hash);

    // Log out the contract address
    console.log('Contract address:', receipt.contractAddress);
};

main();
