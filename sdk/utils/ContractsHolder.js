const { createWrappedContract, WrappedEthersContract } = require("./WrappedEthersContract")
const { ethers } = require('ethers');

class ContractsHolder {
    constructor() {
        this.contracts = {}
    }

    addContract(address, abi) {
        if (this.contracts[address]) {
            return
        }
        this.contracts[address] = createWrappedContract(address, abi, this.wallet.eoa, this.wallet.provider, this.wallet.chainId)
    }
    addContracts(addrs, abi) {
        addrs.forEach(addr => {
            this.addContract(addr, abi)
        })
    }

}

module.exports = { ContractsHolder }