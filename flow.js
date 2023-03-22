import { FunWallet, FunWalletConfig, FunAccountManager, Auth, Modules } from "Funwallet"

// 1. How to specify global Fun settings
// There is some file containing env variables so we don't need to specify varibales like API_KEY over & over again
const env_options = {
  paymaster: {
    "sponsor_address": "", // Dev-specific
    "token_name": ""
  }, // Defaults to
  api_key: "", // Default to None
  sendTxLater: False, // Defaults to False
  chains: [""] // Defaults to an array of all supported chains. Reasons for modifying this are if we do not want to create a FunWallet on all chains & have to prefund it on all chains, needing gas tokens for each one.
}
FunAccountManager.configureEnvironment(env_options)


// 2. How to create a validator/authorizer for a FunWallet
// 2.1 Single EOA Auth
// Eventually auth will have to be an RBAC object, as there will be multiple possible auth types per User & per connected Module
const auth = Auth.EOAAuth(web3.provider.getSigner())

// 3. Prefund a FunWallet
// Only required to perform prefund before creating & initializing a new FunWallet that does not have a paymaster attached to it.
const prefundAmt = .3
await FunWallet.utils.fund(wallet.address, chain, prefundAmt)


// 4. How to create a FunWallet
// 4.1 That already exists (deployed)
// 4.1.1 Trusts Fun
const uid = "" // A User ID in Fun's backend, generated pseudorandomly by Fun.
const wallet = new FunWallet()
await wallet.init(uid)

// 4.1.2 Does not trust Fun
const salt = "" // A hash generated from the authentication type of a FunWallet (for not only ECDSA pub key). Eventually this will support multiple authentication types.
const index = "" // The ith FunWallet of a user
const wallet2 = new FunWallet()
await wallet2.init(salt, index)


// 4.3 That does not already exist (not deployed)
// 4.3.1 With prebuilt config by Fun
const config = FunWalletConfig.MPCWallet

// 4.3.2 With already existing config found on another FunWallet on a customer's dashboard
const config_id = "" // Hash found
const config2 = FunWalletConfig(config_id) // config is module configuration, is optional

// 4.3.3 With a config built from scratch
const config3 = {
  // TBD
  // contains the structure of validation scheme, any specific modules the Wallet has out of the box, the RBAC attached to those modules, etc
}

const options = {} // Optional param. If not specified, options default to what is fonud in the environment variables set by FunAccountManager.configureEnvironment(env_options)
const wallet3 = new FunWallet()
const receipt = await wallet3.create(auth, index, config, options) // config param is optional here. If not specified, create() generates a skeleton FunWallet.
// Note, if sendTxLater: True then wallet.create() does not return a receipt, it returns a signed Tx to deploy later, as below
// const tx = await wallet3.create(auth, index, config, {sendTxLater: True})


// 5. Perform 1st class actions
// 5.1 With sending Tx later
const tx = await wallet.transfer(to, amount, "USDC", { sentTxLater: True })

// 5.2 With sending Tx immediately
const receipt2 = await wallet.transfer(to, amount, "USDC")

// Another example below
swapOptions = { type: "swapExactIn", slippage: 0.5, to: wallet.address }
await wallet.swap("eth", "usdc", 5, swapOptions) // swapOptions is optional, by default there are some reasonable values chosen by Fun

// 6. Perform 2nd class actions
// In general, flow will look like: wallet.execute(func, options), where func is a function which specifies how to construct calldata
const { AavePassthrough } = Modules
const withdrawFunction = AavePassthrough.withdraw(amount, to, ...)
const receipt3 = wallet.execute(withdrawFunction, options)


// 7. Passthrough Txs
FunWallet.utils.approve(wallet.address, "usdc", 100)
const receipt4 = wallet.execute(withdrawFunction, options)

// 8. Send stored Txs
// 8.1 These require a signature
wallet.sendTxs([(calldata, options), (calldata, options)])
// 8.2 These are already signed
FunWallet.sendTxs([tx, tx1])

// 9. FunWallet state
// wallet.getState() gets the state of the on-chain wallet
const walletState = await wallet.getState()
// wallet.getState() gets the state of the on-chain wallet & updates it after simulating the transaction in the input param
const walletState2 = await wallet.simulateStateChange([tx, tx2, tx3])
