/** @type import('hardhat/config').HardhatUserConfig */

require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/lcA7Kyqv42J1Qh-wLm__DdqSCJBtZyd1",
      }
    }
  }
};
