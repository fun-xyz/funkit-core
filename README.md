![backdrop](https://user-images.githubusercontent.com/5194671/219986266-bfbf6143-dfdf-4154-8afc-156d19d9603e.png)

# **FunKit**

FunKit empowers you to include feature-rich and extensible smart wallets built on account abstraction into your applications. Leveraging the FunKit, you can customize gas behavior, adopt multi-sig and common authentication method, monitorize your application, and execute any transactions from smart wallets.

## **Table of Contents**

1. **[Installation](#installation)**

2. **[Quick Start](#quickstart)**

3. **[Testing](#testing)**

4. **[More Resources](#moreresources)**

## <a id="installation"></a> **Installation**

```
npm i @fun-xyz/core --save
# or
yarn add @fun-xyz/core
```

## <a id="quickstart"></a> **Quick Start**

FunKit requires to be configured with api key. You can get the api key by logging to our [dashboard] (https://app.fun.xyz/sign-in/request).

### 1. Import Required Class

Let's import all required class from the library first

```js
import { FunWallet, configureEnvironment, Auth } from "@fun-xyz/core"
// or
const { FunWallet, configureEnvironment, Auth } = require("@fun-xyz/core")
```

### 2. Configure Wallet Global Environment

First, set your environment variables for how your smart wallets will interact with blockchains. This information includes chain, apiKey, and optional gasSponsor.

1. `chain` - Each FunWallet exists on an [EVM-compatible blockchain](https://ethereum.org/en/developers/docs/evm/).
2. `apiKey` - You can get the api key by logging to our [dashboard] (https://app.fun.xyz/sign-in/request).
3. `gasSponsor` - All wallets have to pay gas to execute transactions on a blockchain and FunWallets are no exception to that. You can prefund the fun wallet some native tokens or you can ask other parties to pay for the gas by specifying [gasSponsor](https://docs.fun.xyz/api-reference/gas-sponsor).

```js
await configureEnvironment({
    chain: CHAIN_ID,
    apiKey: API_KEY,
    gasSponsor: {
        sponsorAddress: SPONSOR_ADDRESS
    }
})
```

### 3. Creating Auth

Now that we have set up the environment, we need a way to sign transactions. All authentication in FunKit is handled with the Auth object. You can use privateKey, viem client, web3 provider, ethers.js signer, rpcProvider or windowEth (metamask) to build the auth.

```js
const auth = new Auth({ privateKey: PRIVATE_KEY })
```

### 4. Initializing FunWallet with Auth

With the Auth instance that we created in the step before, we are now able to initialize your FunWallet. Here are the FunWallet constructor parameters

1. `users` - This is an `User[]` that holds all `users` that can access your `FunWallet`. Since we’re only using 1 private key, our `User[]` only has 1 instance.
2. `uniqueId` - This is a random seed that is generated from our `Auth` instance. The purpose of this seed is to generate the `address` of our `FunWallet`.

```js
const funWallet = new FunWallet({
    users: [{ userId: auth.getAddress() }],
    uniqueId: auth.getWalletUniqueId()
})
```

### 5. Initiating a Transfer

Now we have the funWallet object, we will show how to transfer some basic ERC20 tokens to other addresses. Note that the smart wallet will only be created on the blockchain after executeOperation is finished.

```js
const transferOp = await funWallet.transfer(auth, await auth.getUserId(), {
    to: RECIPIENT_ADDRESS,
    amount: AMOUNT,
    token: TOKEN_TO_SEND
})
const receipt = await funWallet.executeOperation(auth, transferOp)
console.log(receipt)
```

## <a id="Testing"></a> **Testing**

### **Testing on Goerli**

You can test FunKit on ethereum goerli testnet with the following configuration. We have a gas sponsor that will cover your gas cost for the first 200 operations so you don't have to worry anything about smart wallet prefund or setting up the gas sponsor by yourselves.

```js
await configureEnvironment({
    chain: "goerli",
    gasSponsor: {
        sponsorAddress: "0xCB5D0b4569A39C217c243a436AC3feEe5dFeb9Ad"
    },
    apiKey: API_KEY
})
```

## <a id="moreresources"></a> **More Resources**

For more detailed information on how to use the FunKit, please refer to the [FunKit Documentation](http://docs.fun.xyz).

Find a live demo [here](https://demo.fun.xyz)

[Fun Team Discord](https://discord.gg/7ZRAv4es)
