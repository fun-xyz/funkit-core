![backdrop](https://user-images.githubusercontent.com/5194671/219986266-bfbf6143-dfdf-4154-8afc-156d19d9603e.png)

# **Overview**

The FunWallet SDK empowers developers to access all of web3's features while working within web2 frameworks. Leveraging the FunWallet SDK, developers can create, deploy and interact with smart contract wallets through customized, modular access control.

<br></br>

## **Table of Contents**

1. **[Installation](#installation)**

2. **[Imports](#imports)**

3. **[Create EOA Instance](#createeoa)**

4. **[Create a FunWallet](#createwallet)**

5. **[Add Module](#addmmodule)**

6. **[Deploy FunWallet](#deploywallet)**

7. **[Create Token Transfer & Deploy Onchain](#createtransfer)**

<br></br>

## **Quickstart**

**Example**

```js
// Imports
import { FunWallet, FunWalletConfig, Modules } from "@fun-wallet/sdk";
const { TokenTransfer } = Modules;
import { ethers } from "ethers";

// Create EOA Instance
const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"; // An internal Fun RPC for customer testing

// Note that the key here will be exposed and should never be used in production
const provider = new ethers.providers.JsonRpcProvider(rpc);
const eoa = new ethers.Wallet(pkey, provider);

// Create a FunWallet
const chainID = "43113";
const prefundAmt = 0.3; // ether
const APIKEY = ""; // Get your API key from app.fun.xyz/api-key

const config = new FunWalletConfig(eoa, chainID, prefundAmt);
const wallet = new FunWallet(eoa, prefundAmt, chainID, APIKEY);
// Gather data asynchronously from onchain resources to get expected wallet data
await wallet.init();

// Add Module
const tokenTransferModule = new TokenTransfer();
await wallet.addModule(tokenTransferModule);

// Deploy FunWallet
const deployWalletReceipt = await wallet.deploy();

// Create Token Transfer & Deploy Onchain
const to = "0xB4C3826aFea3Bc437C49695983eAaCFF2Bf8E305"; // Receiver of tokens
const amount = ethers.utils.parseEther(".01"); // Amount of tokens
const tokenAddr = "0x9983f755bbd60d1886cbfe103c98c272aa0f03d6"; // Token address

const tokenTransferTx = await tokenTransferModule.createTransferTx(to, amount, { address: tokenAddr });
const tokenTransferReceipt = await wallet.deployTx(tokenTransferTx);
console.log(tokenTransferReceipt);
```

**Example Output**

```
{
  userOpHash: '0xd7ea68043200a00db7bdf072842cb3669456525ab24db6032f910fe7aafd56cb',
  txid: '0xb98e9c5cd9451a5b7335723f223738eaa0c16b3a60f47e9d3592ff5faef54fb4',
  gasUsed: 173974,
  gasUSD: 0.09142246713
}
```

> **Verify Success On-Chain**
>
> To verify that this transaction executed successfully, view the transaction id on your testnet.
>
> For example, if you're using AVAX, you can enter the following:
> https://testnet.snowtrace.io/tx/0xb98e9c5cd9451a5b7335723f223738eaa0c16b3a60f47e9d3592ff5faef54fb4

<br></br>

## **1. Installation**

To install the FunWallet SDK, run either commands:

```bash
npm i @fun-wallet/sdk

# or

yarn add @fun-wallet/sdk
```

<br></br>

## **2. Imports**

We begin by importing the required libraries. For this sample flow we will need the FunWallet class, the FunWallet config class, and the TokenTransfer Module from the FunWallet SDK, as well as the ethers library to make sure we can sign Transactions from an EOA.

```js
import { FunWallet, FunWalletConfig, Modules } from "@fun-wallet/sdk";
const { TokenTransfer } = Modules;
import { ethers } from "ethers";
```

<br></br>

## <a id="createeoa"></a> **3. Create EOA Instance**

Next, we create an EOA instance which we will use to sign transactions in this flow. We can create an EOA instance in one of 2 ways:

- With a known private key (for testing)

```js
// An internal Fun RPC for customer testing
const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7";

// Note that the key here will be exposed and should never be used in production
const provider = new ethers.providers.JsonRpcProvider(rpc);
const eoa = new ethers.Wallet(pkey, provider);
```

- With MetaMask or other wallet provider

```js
// Leverage a wallet that already exists on MetaMask
// This code is standard Ether.js code
const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send("eth_requestAccounts", []); // <- this promps user to connect metamask
const eoa = provider.getSigner();
```

<br></br>

## <a id="createwallet"></a> **4. Create a FunWallet**

Once we have an EOA we can move onto creating a `FunWallet` instance. `FunWallet` is the main class of the FunWallet SDK, it is responsible for coordinating the movement of assets and data between Modules. The FunWallet class also stores information relating to the access control schema of said wallet.

The `FunWallet` class infers multiple properties via the `FunWalletConfig` class.

```js
// Parameters
const chainID = "43113";
const prefundAmt = 0.3; // ether
const APIKEY = ""; // Get your API key from app.fun.xyz/api-key

// Creating Wallet
const config = new FunWalletConfig(eoa, chainID, prefundAmt);
const wallet = new FunWallet(config, APIKEY);
await wallet.init();
```

> **Note**
>
> The `FunWallet` address is pre-programmed to be consistent across all chains, pre-deployment.

> **Common Errors On This Step**
>
> **Error**: `insufficient funds for intrinsic transaction cost`
>
> **Description**
> Your EOA does not have enough native token to send funds to the `FunWallet` onchain such that it can execute it's necessary actions.
>
> **Solutions**
>
> - If you have never run `wallet.deploy()` make sure that you have enough eth in your testnet wallet to properly fund the `FunWallet` account.
> - If you have run `wallet.deploy()` already, it is possible that the account already has enough ETH already. Here, you can just set the `prefundAmt` to `0.0`.

<br></br>

## <a id="addmmodule"></a> **5. Add a Module**

Now that we have a `FunWallet` instance, we can add and remove Modules as we see fit. All of these modifications are stored locally and will not be reflected on-chain until we deploy the wallet instance.

For our example flow, we simply add the `TokenTransfer` module to our FunWallet.

The addition of a `Module` to a FunWallet returns a `Transaction`, an object representing a blockchain transaction ready to be deployed. In our example flow, this Transaction object is referred to as executeModuleTx:

```js
// Add the Transfer module
const tokenTransferModule = new TokenTransfer();
await wallet.addModule(tokenTransferModule);
```

<br></br>

## <a id="deploywallet"></a> **6. Deploy FunWallet**

We are now ready to deploy our FunWallet instance containing the `TokenTransfer` Module. To deploy this wallet to a chain (specified by chainId parameter in FunWallet constructor), we simply call the deploy method. This method returns a receipt indicating the success or failure of the deployment.

```js
const deployWalletReceipt = await wallet.deploy();
```

<br></br>

## <a id="createtransfer"></a> **7. Create Transaction & Deploy Onchain**

We finish off our flow by creating & deploying a `Transaction` onchain. This method returns a receipt indicating the success or failure of the deployment.

```js
// Parameters
const to = "0xB4C3826aFea3Bc437C49695983eAaCFF2Bf8E305"; // Receiver of tokens
const amount = ethers.utils.parseEther(".01"); // Amount of tokens
const tokenAddr = "0x9983f755bbd60d1886cbfe103c98c272aa0f03d6"; // Token address
// Creating Transfer Transaction
const tokenTransferTx = await tokenTransferModule.createTransferTx(to, amount, { address: tokenAddr });
const tokenTransferReceipt = await wallet.deployTx(tokenTransferTx);
```

<br></br>

# **Testing With a Fork Environment**

### How to set up Fork Enviroment

Starting point: `/fun-wallet-sdk`

```
npx hardhat node --fork "https://eth-mainnet.g.alchemy.com/v2/lcA7Kyqv42J1Qh-wLm__DdqSCJBtZyd1"
```

### In a seperate terminal tab

Starting point: `/fun-wallet-sdk`

```
cd test
node ForkSetup.js -d
node ForkSetup.js -dp
node ForkSetup.js -b
```

The last command should return something like this but with a different entrypoint address:

```
yarn run bundler --network "http://127.0.0.1:8545" --entryPoint "{GIVEN_ENTRYPOINT_ADDRESS}"
```

### In a seperate terminal tab

If you don't already have the bundler clone it.

Ignore this error

```javascript
Error: test/Flow.test.ts(7,30): error TS2307: Cannot find module '../src/SimpleAccountABI' or its corresponding type declarations.
```

Starting point: `~/{HOME_DIR}`

```
git clone https://github.com/TheFunGroup/AA_Bundler.git
cd AA_Bundler
yarn && yarn preprocess
cd packages/bundler
yarn run bundler --network "http://127.0.0.1:8545" --entryPoint "{GIVEN_ENTRYPOINT_ADDRESS}"
```

Now the local fork is setup, you can run any file inside of the test folder and see the result.

Starting point: `/fun-wallet-sdk`

```
cd test
chmod +x runAll.sh
./runAll.sh
```

Specify the parameter of which chain token `tokenTransfer` is to be ran on. Testnet is set to Avalanche FUJI

### Two examples:

```
yarn run test-tokenTransfer fork
```

```
yarn run test-tokenTransfer testnet
```

## More Documentation

For more detailed information on how to use the FunWallet SDK, please refer to the [FunWallet Documentation](http://docs.fun.xyz).

[Fun Team Twitter](http://twitter.com/fun)
