const { ethers } = require("ethers");
const { Chain } = require("../data");
const { GOERLI_PRIVATE_KEY, TEST_PRIVATE_KEY } = require("./test");
const walletObj = require("../abis/FunWalletFactory.json")
const { ContractFactory } = ethers

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params, { gasLimit: 5_500_000 });
    return contract.address
}

const main = async () => {
    const provider = await (new Chain({ chainId: 5 }).getProvider())
    const signer = new ethers.Wallet(GOERLI_PRIVATE_KEY, provider)
    console.log(await deploy(signer, walletObj))
}
main()