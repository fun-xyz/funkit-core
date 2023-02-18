const ethers = require('ethers')
async function fundAccount(eoa, address, amt) {
    amt = ethers.utils.parseEther(amt.toString())
    const tx = await eoa.sendTransaction({ to: address, from: await eoa.getAddress(), value: amt })
    return await tx.wait()
}

module.exports = {
    fundAccount
}
