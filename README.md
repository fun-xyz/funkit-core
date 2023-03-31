![backdrop](https://user-images.githubusercontent.com/5194671/219986266-bfbf6143-dfdf-4154-8afc-156d19d9603e.png)

# **Overview**

The FunWallet SDK empowers developers to access all of web3's features while working within web2 frameworks. Leveraging the FunWallet SDK, developers can create, deploy and interact with smart contract wallets through customized, modular access control.

## **Features**

- 💰 Automate Defi Actions for an EOA
- ⛽ Sponsor/Gasless Transactions
- 🔄 Swap tokens with Uniswap

## **Table of Contents**

1. **[Install packages](#installation)**

2. **[Add Imports](#imports)**

3. **[Create EOA Instance](#createeoa)**

4. **[Create a FunWallet](#createwallet)**

5. **[Add Module](#addmmodule)**

6. **[Deploy FunWallet](#deploywallet)**

7. **[Create Token Transfer & Deploy Onchain](#createtransfer)**

## **Quickstart**


FunWallet is the simplest way to create a wallet in your React.js web application. It comes with sensible defaults out of the box so you can focus on building.

Find a live demo [here](http://demo.fun.xyz).

## 1. Install

Download our package. If necessary, also download [ethers.js](https://docs.ethers.org/v5/getting-started/#installing).

```npm install @fun-wallet/sdk ethers@5.7.2```

<Alert tone="info">

If you do not have an API Key, request to join our [private beta](https://app.fun.xyz/sign-in/request). If you have an API Key, go to the [API Dashboard](http://app.fun.xyz/api-key) to view your API Key.

</Alert>

## 2. Create Wallet

First, set your environment variables for how your FunWallet will interact with blockchains. This information includes your API_KEY.


```js
const options = {
  chain: CHAIN_ID,
  apiKey: API_KEY,
  gasSponsor: {
    sponsorAddress: SPONSOR_ADDRESS,
    token: "USDC",
  },
};
```

 ```js
import { ethers } from "ethers"
import { FunWallet, TokenSponsor, configureEnvironment } from "@fun-wallet/sdk"
import { Eoa } from "@fun-wallet/sdk/auth"

// Configure gas mechanics to pay gas in USDC
const options = {
  chain: CHAIN_ID,
  apiKey: API_KEY,
  gasSponsor: {
    sponsorAddress: SPONSOR_ADDRESS,
    token: "USDC"
  }
}
await configureEnvironment(options)

/*
Get the user's EOA. This is used to:
- Fund the FunWallet with ETH
- Stake USDC in the Paymaster on behalf of the FunWallet
*/
const provider = new ethers.providers.Web3Provider(window.ethereum, "any")
await provider.send('eth_requestAccounts', [])
const eoa = provider.getSigner()
const auth = new Eoa({ signer: eoa })

// Get FunWallet associated with EOA
const salt = await auth.getUniqueId()
const wallet = new FunWallet({ salt })

```
## 3. Run Transactions

Execute transactions or swaps in one line of code.

```js
// Transfer 5 USDC to TO_ADDR.
const transferReceipt = await wallet.transfer(auth, TO_ADDR, 5, "USDC");
// Swap 5 USDC for ETH
const swapReceipt = await wallet.swap(auth, "ETH", "USDC", 5, swapOptions);
```


```js
import { ethers } from "ethers"
import { FunWallet, TokenSponsor, configureEnvironment } from "@fun-wallet/sdk"
import { Eoa } from "@fun-wallet/sdk/auth"

// Configure gas mechanics to pay gas in USDC
const options = {
  chain: CHAIN_ID,
  apiKey: API_KEY,
  gasSponsor: {
    sponsorAddress: SPONSOR_ADDRESS,
    token: "USDC"
  }
}
await configureEnvironment(options)

/*
Get the user's EOA. This is used to:
- Fund the FunWallet with ETH
- Stake USDC in the Paymaster on behalf of the FunWallet
*/
const provider = new ethers.providers.Web3Provider(window.ethereum, "any")
await provider.send('eth_requestAccounts', [])
const eoa = provider.getSigner()
const auth = new Eoa({ signer: eoa })

// Get FunWallet associated with EOA
const salt = await auth.getUniqueId()
const wallet = new FunWallet({ salt })

// Generate & deploy/execute Transactions that approve & send USDC & ETH from eoa to the Paymaster contract,
// enabling wallet to transact by draining this staked USDC
const sponsor = new TokenSponsor()
const sponsorStakeTx = await sponsor.stake(auth.getUniqueId(), 2)
const approveTx = await sponsor.approve("USDC", 10)
const stakeTx = await sponsor.stakeToken("USDC", await wallet.getAddress(), 10)
await auth.sendTxs([sponsorStakeTx, approveTx, stakeTx])
await configureEnvironment({gasSponsor: {sponsorAddress: auth.getUniqueId()}})

// Send 0.1 ETH from the EOA to
// Perform a transfer of 0.1 ETH from wallet to TO_ADDR
// This logs the difference between the amount of staked USDC in the Paymaster before & after a FunWallet transaction
await prefundWallet(eoa, wallet, 0.1)
console.log(sponsor.getTokenBalance("USDC", wallet.getAddress()))
wallet.transfer(auth, { TO_ADDR, 0.1, "ETH" } )
console.log(sponsor.getTokenBalance("USDC", wallet.getAddress()))
```

# **Testing With a Fork Environment**

## <a id="testwithremotebundler"></a> **1. [Easy] Testing with remote bundler**

You can run any file inside of the test/fork folder and see the result. By default, the tests will run with Fun managed bundler and on the Fun testnet, which is a fork from ethereum mainnet.

Starting point: `/fun-wallet-sdk`
```
npm run test-funtestnet
```
or

```
env REMOTE_TEST=true npx mocha test/fork/Swap.js
```

## <a id="testwithlocalbundler"></a> **2. [Pro] Testing with local bundler**

You need to spin up a bundler and local fork at your local environment and then run tests. Please follow the following steps.

### <a id="testwithlocalbundler"></a> **1. Clone the Bundler Repo**

Starting point: `~/{HOME_DIR}`

```
git clone https://github.com/TheFunGroup/bundler.git
```
### <a id="testwithlocalbundler"></a> **2. Set Up the Fork and Bundler Locally**

Once the bundler is cloned, follow the instructions in https://github.com/TheFunGroup/bundler/blob/main/README.md before moving onto the following steps

### <a id="testwithlocalbundler"></a> **3. Run Test**

Now the local fork is setup, you can run any file inside of the test folder and see the result.

Starting point: `/fun-wallet-sdk`

```
npm run test-localfork
```
or 
```
env REMOTE_TEST=false npx mocha test/fork/Swap.js
```

# **Testing With a Goerli Environment**

You can run any file inside of the test/goerli folder and see the result.

Starting point: `/fun-wallet-sdk`
```
npm run test-goerli
```

or 
```
npx mocha test/goerli/Factory.js
```

## More Documentation

For more detailed information on how to use the FunWallet SDK, please refer to the [FunWallet Documentation](http://docs.fun.xyz).

[Fun Team Twitter](http://twitter.com/fun)
