const { DataServer } = require('../utils/DataServer')
const { expect } = require("chai")

describe("Getting chain info", async function () {

  function compareObjects(obj1, obj2) {
    if (obj1.length !== obj2.length) {
      return false
    }

    let keys = Object.keys(obj1)
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
        return false
      }
    }

    return true
  }

  it("succeed case", async function () {
    await this.timeout(5000)
    let chainFromName = await DataServer.getChainFromName("ethereum");
    let chainFromId = await DataServer.getChainInfo(1);
    expect(compareObjects(chainFromName, chainFromId)).to.be.true

    chainFromName = await DataServer.getChainFromName("avalanche");
    chainFromId = await DataServer.getChainInfo(43114);
    expect(compareObjects(chainFromName, chainFromId)).to.be.true

    chainFromName = await DataServer.getChainFromName("avalanche-fuji");
    chainFromId = await DataServer.getChainInfo(43113);
    expect(compareObjects(chainFromName, chainFromId)).to.be.true

    chainFromName = await DataServer.getChainFromName("polygon");
    chainFromId = await DataServer.getChainInfo(137);
    expect(compareObjects(chainFromName, chainFromId)).to.be.true

    chainFromName = await DataServer.getChainFromName("polygon-mumbai");
    chainFromId = await DataServer.getChainInfo(80001);
    expect(compareObjects(chainFromName, chainFromId)).to.be.true

    chainFromName = await DataServer.getChainFromName("ethereum-localfork");
    chainFromId = await DataServer.getChainInfo(31337);
    expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
  })
})