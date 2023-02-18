## How to set up Fork Enviroment

Starting point: `/fun-wallet-sdk`

```
npx hardhat node --fork "https://eth-mainnet.g.alchemy.com/v2/lcA7Kyqv42J1Qh-wLm__DdqSCJBtZyd1"
```

## `In a seperate terminal tab`

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

## `In a seperate terminal tab`

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

```
yarn run test-aaveWithdrawal
yarn run test-tokenTransfer [param]
yarn run test-tokenSwap
```

Specify the parameter of which chain token `tokenTransfer` is to be ran on. Testnet is set to Avalanche FUJI

### Two examples:

```
yarn run test-tokenTransfer fork
```

```
yarn run test-tokenTransfer testnet
```
