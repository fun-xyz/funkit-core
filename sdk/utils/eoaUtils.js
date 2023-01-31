const ethers = require('ethers')
async function fundAccount(eoa, address, amt) {
    amt = ethers.utils.parseEther(amt.toString())
    const tx = await eoa.sendTransaction({ to: address, from: await eoa.getAddress(), value: amt })
    return await tx.wait()
}

async function sendEOATransaction(tx) {
    const submittedTx = await this.eoa.sendTransaction(tx);
    return await submittedTx.wait()
}

module.exports = {
    fundAccount
}
