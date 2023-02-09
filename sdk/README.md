

## How to run TestAavePosition.js

rpcurl optional

Format:
```yarn test-aaveWithdrawal [aTokenAddress] [privKey] [preFundAmt] [apiKey] [rpcurl] ```

Example:
```yarn test-aaveWithdrawal 0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0.3 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf```


With rpc:

```yarn test-aaveWithdrawal 0x7021eB315AD2Ce787E3A6FD1c4a136c9722457Cc 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7```


## How to run TestTokenTransfer.js
 
**Make sure to fund Fun Wallet Address**
 
 ```yarn test-transferToken [tokenAddr] [privKey] [preFundAmt] [apiKey] [rpcurl] ```

*Address of USDC on AVAX-FUJI*

```yarn test-transferToken 0x5425890298aed601595a70AB815c96711a31Bc65 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7```

matic
```yarn test-transferToken 0x0FA8781a83E46826621b3BC094Ea2A0212e71B23 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0.1 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf https://polygon-mumbai.blockpi.network/v1/rpc/public```