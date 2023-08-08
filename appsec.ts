// import { Auth } from "./src/auth"
// import { GlobalEnvOption, configureEnvironment } from "./src/config"
// import { GaslessSponsor } from "./src/sponsors"
// import { FunWallet } from "./src/wallet"
// import { getTestApiKey } from "./tests/getAWSSecrets"
// import "./fetch-polyfill"

// export interface TransferTestConfig {
//     chainId: number
//     USDT: string
//     USDC: string
//     DAI: string
//     eth: string
//     prefund: boolean
//     index?: number
//     amount?: number
//     prefundAmt?: number
//     numRetry?: number
// }

// export const TransferTest = (config: TransferTestConfig) => {
//     const { USDC, USDT, eth, prefund, prefundAmt } = config

//     /*
//     describe("Single Auth Transfer", function () {
//         this.timeout(300_000)
//         let auth: Auth
//         let wallet: FunWallet
//         let apiKey: any

//         before(async function () {
//             this.retries(config.numRetry ? config.numRetry : 0)
//             apiKey = await getTestApiKey()
//             const options: GlobalEnvOption = {
//                 chain: config.chainId,
//                 apiKey: apiKey,
//                 gasSponsor: undefined
//             }
//             await configureEnvironment(options)
//             auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
//             wallet = new FunWallet({
//                 users: [{ userId: await auth.getAddress() }],
//                 uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 1792811340)
//             })
//             //if (prefund) await fundWallet(auth, wallet, prefundAmt ? prefundAmt : 1)
//         })
//         it("get wallet", async () => {

//             // 0x8be961Caae1a2461510c0a4d716BB27f53468640
//             auth = new Auth({ privateKey: "0x430471361e8800b74fa48bbe9fd6ac083c14da340bc548642ab06bac2a9f057e" })

//             wallet = new FunWallet({
//                 users: [{ userId: await auth.getAddress() }],
//                 uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 1792811340)
//             })

//             console.log(await wallet.getAddress());

//         })

//         it("transfer eth directly", async () => {
//             const randomAddress = randomBytes(20)
//             const walletAddress = await wallet.getAddress()

//             const b1 = Token.getBalance(eth, randomAddress)
//             const b2 = Token.getBalance(eth, walletAddress)

//             console.log("Wallet address:", walletAddress)

//             // Build out the user operation to send ETH
//             const userOp = await wallet.transfer(auth, await auth.getAddress(), {
//                 to: randomAddress,
//                 amount: config.amount ? config.amount : 0.001
//             })

//             // Execute the user operation
//             await wallet.executeOperation(auth, userOp)
//             const b3 = Token.getBalance(eth, randomAddress)
//             const b4 = Token.getBalance(eth, walletAddress)

//             const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
//                 await Promise.all([b1, b2, b3, b4])

//             assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
//             assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
//         })

//         it("transfer ERC20 token directly", async () => {
//             const walletAddress = await wallet.getAddress()
//             //const randomAddress = randomBytes(20)
//             const randomAddress = "0x65b7bB395b2A3dCcFd22BD616aF8e000D1Df195B"

//             const b1 = Token.getBalance(USDC, randomAddress)
//             const b2 = Token.getBalance(USDC, walletAddress)

//             // Build out the user operation to send ETH
//             const userOp = await wallet.transfer(auth, await auth.getAddress(), {
//                 to: randomAddress,
//                 amount: 1,
//                 token: USDC
//             })

//             // Execute the user operation
//             const op = await wallet.executeOperation(auth, userOp)

//             const b3 = Token.getBalance(USDC, randomAddress)
//             const b4 = Token.getBalance(USDC, walletAddress)

//             const [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] =
//                 await Promise.all([b1, b2, b3, b4])

//             console.log(randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter, op)
//             assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
//             assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")
//         })

//         it("Swap ERC20 for ERC20", async () => {

//             const walletAddress = await wallet.getAddress()
//             const tokenBalanceBefore = await Token.getBalance(USDC, walletAddress)
//             const operation = await wallet.swap(auth, await auth.getAddress(), {
//                 in: USDC,
//                 amount: 1,
//                 out: USDT,
//                 slippage: 0.5, // Weirdness...
//                 returnAddress: walletAddress,
//                 chainId: config.chainId
//             })
//             const op = await wallet.executeOperation(auth, operation)
//             const tokenBalanceAfter = await Token.getBalance(USDC, walletAddress)
//             console.log(op)

//             assert(Number(tokenBalanceAfter) < Number(tokenBalanceBefore), "Swap did not execute")

//         })

//         it("Gasless Usage", async () => {

//             // 0x8be961Caae1a2461510c0a4d716BB27f53468640
//             const fundAuth = new Auth({ privateKey: "0x430471361e8800b74fa48bbe9fd6ac083c14da340bc548642ab06bac2a9f057e" })

//             const funderWallet = new FunWallet({
//                 users: [{ userId: await fundAuth.getAddress() }],
//                 uniqueId: await fundAuth.getWalletUniqueId(config.chainId.toString(), 179281134100)
//             })

//             const options: GlobalEnvOption = {
//                 chain: config.chainId,
//                 apiKey: apiKey
//             }

//             await configureEnvironment({
//                 ...options,
//                 gasSponsor: {
//                     sponsorAddress: "0x8be961Caae1a2461510c0a4d716BB27f53468640"
//                 }
//             })

//             const sponsor = new GaslessSponsor()
//             const funderAddress = await funderWallet.getAddress()
//             const depositInfo1S = await sponsor.getBalance(funderAddress)
//             const stake = await sponsor.stake(funderAddress, funderAddress, 0.00001)
//             console.log(await fundAuth.sendTx(stake))
//             console.log(await wallet.getAddress())
//         })

//     })*/
//     describe("Gasless", function () {
//         let sponsor: any
//         let apiKey: any
//         let wallet: FunWallet
//         let auth: Auth

//         this.timeout(100000)
//         before("Gassless Try 1", async () => {
//             apiKey = await getTestApiKey()
//             const options: GlobalEnvOption = {
//                 chain: config.chainId,
//                 apiKey: apiKey,
//                 gasSponsor: undefined
//             }
//             await configureEnvironment(options)
//             auth = new Auth({ privateKey: "0x98e9cfb323863bc4bfc094482703f3d4ac0cd407e3af2351c00dde1a6732756a" })
//             wallet = new FunWallet({
//                 users: [{ userId: await auth.getAddress() }],
//                 uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.index ? config.index : 1792811340)
//             })

//             // 0x8be961Caae1a2461510c0a4d716BB27f53468640
//             const fundAuth = new Auth({ privateKey: "0x430471361e8800b74fa48bbe9fd6ac083c14da340bc548642ab06bac2a9f057e" })

//             /*
//             const timestamp = Date.now()

//             // https://jwt.io/introduction
//             var string_to_sign = {
//                 expiration: timestamp + 60 * 60 * 1, // Amount of hours this is valid for.
//                 issuedAt: timestamp // When this was created - shouldn't be before a certain time
//                 // DO NOT ADD in 'address'! Instead, recover the address from the signature.
//             }

//             var signed_data = Buffer.from(JSON.stringify(string_to_sign), 'utf8').toString('hex')

//             // Signing method - may need to modify this to be a 'personal_sign' for metamask though.
//             var sig = await auth.signHash( // Unsafe according to metamask - personal_sign would work too.
//                 await ethers.utils.keccak256(
//                     "0x" + signed_data
//                 )
//             )

//             console.log(sig)
//             */

//             const funderWallet = new FunWallet({
//                 users: [{ userId: await fundAuth.getAddress() }],
//                 uniqueId: await fundAuth.getWalletUniqueId(config.chainId.toString(), 179281134100)
//             })

//             const options2: GlobalEnvOption = {
//                 chain: config.chainId,
//                 apiKey: apiKey
//             }

//             await configureEnvironment({
//                 ...options2,
//                 gasSponsor: {
//                     // My sponsor
//                     sponsorAddress: "0x3aD758e498eCcB2CC378c7eB73E98e62CD4871d1"
//                 }
//             })

//             sponsor = new GaslessSponsor()

//             //await funderWallet.sendTx(await sponsor.setToBlacklistMode(config.chainId, "0x3aD758e498eCcB2CC378c7eB73E98e62CD4871d1"))
//             const funderAddress = await fundAuth.getAddress()
//             //console.log(await wallet.getAddress())
//             // Set up our test wallet to work for our gas sponsor
//             // await fundAuth.sendTx(await sponsor.setToBlacklistMode(config.chainId, funderAddress))
//             const dat = await sponsor.getListMode(funderAddress)
//             console.log(dat)
//             //console.log("HERE2?")
//             //await fundAuth.sendTx(await sponsor.addSpenderToWhiteList(config.chainId, funderAddress, await wallet.getAddress()))
//         })

//         it("Gasless Boom", async () => {
//             // Build out the user operation to send ETH
//             const userOp = await wallet.transfer(auth, await auth.getAddress(), {
//                 to: "0x8be961Caae1a2461510c0a4d716BB27f53468640",
//                 amount: 1,
//                 token: USDC
//             })
//             console.log("UserOp:", userOp)
//             console.log("SendTX:", await wallet.executeOperation(auth, userOp))
//         })
//     })
// }

// const USDC = "0xaa8958047307da7bb00f0766957edec0435b46b5"
// const DAI = "0x855af47cdf980a650ade1ad47c78ec1deebe9093"
// const USDT = "0x3e1ff16b9a94ebde6968206706bcd473aa3da767"

// const config: TransferTestConfig = {
//     chainId: 5,
//     USDC: USDC,
//     DAI: DAI,
//     USDT: USDT,
//     eth: "eth",
//     prefund: false
// }
// TransferTest(config)
