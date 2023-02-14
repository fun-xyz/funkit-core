

## How to run TestAavePosition.js

rpcurl optional

Format:
```
yarn test-aaveWithdrawal [aTokenAddress] [privKey] [preFundAmt] [apiKey] [rpcurl]
```

```
yarn test-aaveWithdrawal 0x7021eB315AD2Ce787E3A6FD1c4a136c9722457Cc 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7
```


## How to run TestTokenTransfer.js
 
**Make sure to fund Fun Wallet Address**
 
 ```
 yarn test-transferToken [tokenAddr] [privKey] [preFundAmt] [apiKey] [rpcurl]
  ```

```
yarn test-transferToken 0x5425890298aed601595a70AB815c96711a31Bc65 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7
```


## How to run TestSwap.js
Starting point: ```/fun-wallet-sdk```

```
cd sdk
npx hardhat node --fork "https://eth-mainnet.g.alchemy.com/v2/lcA7Kyqv42J1Qh-wLm__DdqSCJBtZyd1"
```
## `In a seperate terminal tab`
Starting point: ```/fun-wallet-sdk```
```
cd sdk/utils/setup
node ForkSetup.js -d
node ForkSetup.js -b
```

The last command should return something like this but with a different entrypoint address:

```
yarn run bundler --network "http://127.0.0.1:8545" --entryPoint "{GIVEN_ENTRYPOINT_ADDRESS}"
```



## `In a seperate terminal tab`

If you don't already have the bundler clone it. 

Ignore this error 

``` javascript
Error: test/Flow.test.ts(7,30): error TS2307: Cannot find module '../src/SimpleAccountABI' or its corresponding type declarations.
```

Starting point: ```~/{HOME_DIR}```
```
git clone https://github.com/TheFunGroup/AA_Bundler.git
cd AA_Bundler
yarn && yarn preprocess
cd packages/bundler
yarn run bundler --network "http://127.0.0.1:8545" --entryPoint "{GIVEN_ENTRYPOINT_ADDRESS}"
```

