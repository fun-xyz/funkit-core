const { FunWallet, PassThroughWallet } = { FunWallet: "" } // import statments

config = {
    user: userId,
    chain: "eth"
}
const userWallet = new FunWallet(config)

// transfer native token: IE 10 eth
await userWallet.transfer(10)

// transfer erc token: IE 10 usdc
await userWallet.transfer(10, "usdc")

// swap token: IE 1 usdc -> .97 dai
const swapConfig = {
    start: "usdc",
    end: "dai",
    amountIn: 1,// usdc amount in
    slippage: 5, // percent :: OPTIONAL
    route: ["aave", "uni"] // full route: usdc -> aave -> uni -> dai :: OPTIONAL
}

await userWallet.swap(swapConfig)


// Pass through Eoa, EOA is ethers wallet

const wallet = new PassThroughWallet(eoa)

const { eoaTransaction, walletOp } = await wallet.transfer(10) // eslint-disable-line no-use-before-define

await eoa.sendTransaction(eoaTransaction)
await wallet.execute(walletOp)

const { eoaTransaction, walletOp } = await wallet.transfer(10, "usdc")

await eoa.sendTransaction(eoaTransaction)
await wallet.execute(walletOp)


const { eoaTransaction, walletOp } = await wallet.aaveWithdraw("usdc", "all")
await eoa.sendTransaction(eoaTransaction)

// after some time

await wallet.execute(walletOp)



// Paymaster pay with usdc

config = {
    user: userId,
    chain: "eth",
    feeCurrency: "usdc",
}

const userWallet = new FunWallet(config)


// Paymaster sponsor gas usdc

config = {
    user: userId,
    chain: "eth",
    sponsorId: "f1219511-4eb9-4512-b771-9274873eca75", // kowye sponsor ID
}
const userWallet = new FunWallet(config)



// Fund from on off ramp

const OnOffRamp = require("funsdk/modules")

const onOfRampConfig = {
    sponsorId: "f1219511-4eb9-4512-b771-9274873eca75", // kowye sponsor ID
    currencies: ["usd", "rea"]
}

const fundingMethod = new OnOffRamp(onOfRampConfig)

config = {
    user: userId,
    chain: "eth",
    fundingMethod,
}

const userWallet = new FunWallet(config)
