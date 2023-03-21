const { DataServer } = require('../utils/DataServer')
const { expect } = require("chai")

describe("Getting chain info", async function () {

  it("succeed case", async function () {
    await this.timeout(5000)
    let chainFromName = await DataServer.getChainFromName("ethereum");
    let chainFromId = await DataServer.getChainInfo(1);
    expect(chainFromName.chain).to.be.equal(chainFromId.chain)

    chainFromName = await DataServer.getChainFromName("avalanche");
    chainFromId = await DataServer.getChainInfo(43114);
    expect(chainFromName.chain).to.be.equal(chainFromId.chain)

    chainFromName = await DataServer.getChainFromName("avalanche-fuji");
    chainFromId = await DataServer.getChainInfo(43113);
    expect(chainFromName.chain).to.be.equal(chainFromId.chain)

    chainFromName = await DataServer.getChainFromName("polygon");
    chainFromId = await DataServer.getChainInfo(137);
    expect(chainFromName.chain).to.be.equal(chainFromId.chain)

    chainFromName = await DataServer.getChainFromName("polygon-mumbai");
    chainFromId = await DataServer.getChainInfo(80001);
    expect(chainFromName.chain).to.be.equal(chainFromId.chain)

    chainFromName = await DataServer.getChainFromName("ethereum-localfork");
    chainFromId = await DataServer.getChainInfo(31337);
    expect(chainFromName.chain).to.be.equal(chainFromId.chain)
  })
})