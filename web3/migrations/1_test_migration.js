const Coin = artifacts.require("Coin");

module.exports = async function (deployer, network, accounts) {
    const account = accounts[0]
    const addr = "0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e"

    await deployer.deploy(Coin);
    //access information about your deployed contract instance
    const instance = await Coin.deployed();
    await instance.mint(addr, 100000)
    console.log(instance.address)

};