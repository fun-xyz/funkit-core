const Web3 = require("web3")
const web3 = new Web3("https://rpc.ankr.com/eth_goerli")
const pkey = "0xbce711e866cd91c85ba2f9b9c83b8e7a872434ff2af2ac8ce9b4301cd42b921a"
const account = web3.eth.accounts.privateKeyToAccount(pkey)
web3
