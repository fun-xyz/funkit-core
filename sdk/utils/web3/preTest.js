const Web3 = require("web3")
const web3 = new Web3("https://rpc.ankr.com/eth_goerli")
const pkey = "0xbce711e866cd91c85ba2f9b9c83b8e7a872434ff2af2ac8ce9b4301cd42b921a"
const account = web3.eth.accounts.privateKeyToAccount(pkey)


const tx = {
    to: "",
    from: "",
    data: "",
    nonce: []
}


const AToken = ('ERCADDR-AAVE');
const spenderAdr = ('AAWalletADDR');
const MAX_INT = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
const ATokenOwner = "";

const amount = "expected amount, MAX_INT if total balance"

AToken.methods.approve(spenderAddr, amount).send({
    from: ATokenOwner
})

const walletGEN = {
    wallet: "", // if empty create new
    users: [
        {
            name: "immuna",
            signatureFromEOA: "",
            actions: [
                {
                    name: "AaveLiquidate",
                    validation: {
                        contractAddr: ""
                    },
                    params: {
                        userAddr: ATokenOwner,
                        aTokenAddr: AToken,
                        positionMax: amount,
                        key: "name for specific user Action pair",
                    },
                }
            ]
        }
    ]
}

// web3.eth.abi.encodeParameters(
//     ['address', 'uint256[]'],
//     ['0x6b175474e89094c44da98b954eedeac495271d0f', [1, 2, 3]]
//   );



const tx2 = {
    to: "",
    from: "",
    data: "",
    nonce: []
}


const tx1 = {
    to: "",
    from: "",
    data: "",
    nonce: [1],
    range: false
}

let nonce = 0;

// range == false
for (let potentialNonceValue of nonce) {
    checkNonce()
}

// range == true

for (let potentialNonceValue = nonce[0]; potentialNonceValue++; potentialNonceValue < nonce[1]) {
    checkNonce()
}

checkNonce = () => {
    if (_nonce + 1 == userOp.nonce) {

    }
}


