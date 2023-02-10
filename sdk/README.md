

## How to run TestAavePosition.js

rpcurl optional

Format:
```
yarn test-aaveWithdrawal [aTokenAddress] [privKey] [preFundAmt] [apiKey] [rpcurl]
```

Example:
```
yarn test-aaveWithdrawal 0x7021eB315AD2Ce787E3A6FD1c4a136c9722457Cc 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7
```


With rpc:

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

```
cd sdk
npx hardhat node --fork "https://eth-mainnet.g.alchemy.com/v2/lcA7Kyqv42J1Qh-wLm__DdqSCJBtZyd1"
```