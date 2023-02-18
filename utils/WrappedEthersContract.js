const { ethers } = require('ethers');
class WrappedEthersContract {
    constructor(wallet, provider, chainId, contract) {
        this.wallet = wallet
        this.provider = provider
        this.chainId = chainId
        this.contract = contract
        this.address = contract.address
    }

    async sendMethodTx(method, params = [], nonceAdd = 0) {
        return await ethersTransaction(this.wallet, this.provider, this.chainId, this.contract, method, params, nonceAdd)
    }

    async createSignedTransaction(method, params = [], nonceAdd = 0) {
        return await createRawTransaction(this.wallet, this.provider, this.chainId, this.contract, method, params, nonceAdd)
    }
    async createUnsignedTransaction(method, params = [], nonceAdd = 0) {
        return await createUnsignedTransaction(this.wallet, this.provider, this.chainId, this.contract, method, params, nonceAdd)
    }

    async getMethodEncoding(method, params = []) {
        return await this.contract.populateTransaction[method](...params)
    }

    async callMethod(method, params = [], postResultfunc = "") {
        const res = await this.contract[method](...params)
        if (postResultfunc) {
            return res[postResultfunc]()
        }
        return res
    }
}

const ethersTransaction = async (wallet, provider, chainId, contract, method, params, nonceAdd = 0) => {
    const estimatedGasLimit = await contract.estimateGas[method](...params)
    const approveTxUnsigned = await contract.populateTransaction[method](...params)
    approveTxUnsigned.gasLimit = estimatedGasLimit;
    approveTxUnsigned.gasPrice = await provider.getGasPrice();
    const addr = await wallet.getAddress()
    approveTxUnsigned.nonce = (await provider.getTransactionCount(addr)) + nonceAdd;
    approveTxUnsigned.chainId = chainId;
    const approveTxSigned = await wallet.signTransaction(approveTxUnsigned);
    const submittedTx = await provider.sendTransaction(approveTxSigned);
    await submittedTx.wait()
    return submittedTx
}

const createRawTransaction = async (wallet, provider, chainId, contract, method, params, nonceAdd = 0) => {
    const estimatedGasLimit = await contract.estimateGas[method](...params)
    const approveTxUnsigned = await contract.populateTransaction[method](...params)
    approveTxUnsigned.gasLimit = estimatedGasLimit;
    approveTxUnsigned.gasPrice = await provider.getGasPrice();
    const addr = await wallet.getAddress()
    approveTxUnsigned.nonce = (await provider.getTransactionCount(addr)) + nonceAdd;
    approveTxUnsigned.chainId = chainId;
    const approveTxSigned = await wallet.signTransaction(approveTxUnsigned);
    return approveTxSigned
}
const createUnsignedTransaction = async (wallet, provider, chainId, contract, method, params, nonceAdd = 0) => {
    const estimatedGasLimit = await contract.estimateGas[method](...params)
    const approveTxUnsigned = await contract.populateTransaction[method](...params)
    approveTxUnsigned.gasLimit = estimatedGasLimit;
    approveTxUnsigned.gasPrice = await provider.getGasPrice();
    const addr = await wallet.getAddress()
    approveTxUnsigned.nonce = (await provider.getTransactionCount(addr)) + nonceAdd;
    approveTxUnsigned.chainId = chainId;
    return approveTxUnsigned
}

const wrapMultipleContracts = (wallet, provider, chainId, contracts) => {
    return contracts.map((contract => {
        return new WrappedEthersContract(wallet, provider, chainId, contract)
    }))
}
const createWrappedContract = (addr, abi, wallet, provider, chainId) => {
    const contract = new ethers.Contract(addr, abi, wallet)
    return new WrappedEthersContract(wallet, provider, chainId, contract)
}

const createMultipleWrappedContracts = (contractData, wallet, provider, chainId) => {
    return contractData.map(({ addr, abi }) => {
        return createWrappedContract(addr, abi, wallet, provider, chainId)
    })
}

module.exports = {
    WrappedEthersContract,
    wrapMultipleContracts,
    createWrappedContract,
    createMultipleWrappedContracts
}