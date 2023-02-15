const { createWrappedContract, WrappedEthersContract } = require("./WrappedEthersContract")
const { ethers } = require('ethers');

class ContractsHolder {
    constructor(eoa, provider, chainId) {
        this.eoa = eoa
        this.provider = provider
        this.chainId = chainId
        this.contracts = {}
    }

    addContract(address, abi) {
        if (this.contracts[address]) {
            return
        }
        this.contracts[address] = createWrappedContract(address, abi, this.eoa, this.provider, this.chainId)
    }

    addEthersContract(address, contract) {
        if (this.contracts[address]) {
            return
        }
        this.contracts[address] = new WrappedEthersContract(this.eoa, this.provider, this.chainId, contract)
    }

    addContracts(addrs, abi) {
        addrs.forEach(addr => {
            this.addContract(addr, abi)
        })
    }
}

module.exports = { ContractsHolder }