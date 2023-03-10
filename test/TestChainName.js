const { DataServer} = require('../utils/DataServer')
const { API_KEY } = require("./TestUtils")
const { expect } = require("chai")

const dataServer = new DataServer(API_KEY);
dataServer.init();

describe("Getting chain info", async function() {
  it("succeed case", async function() {
    try {
      let chainFromName = await dataServer.getChainFromName("ethereum");
      let chainFromId = await DataServer.getChainInfo(1);
      expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
      chainFromName = await dataServer.getChainFromName("avalanche");
      chainFromId = await DataServer.getChainInfo(43114);
      expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
      chainFromName = await dataServer.getChainFromName("avalanche-fuji");
      chainFromId = await DataServer.getChainInfo(43113);
      expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
      chainFromName = await dataServer.getChainFromName("polygon");
      chainFromId = await DataServer.getChainInfo(137);
      expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
      chainFromName = await dataServer.getChainFromName("polygon-mumbai");
      chainFromId = await DataServer.getChainInfo(80001);
      expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
      chainFromName = await dataServer.getChainFromName("ethereum-localfork");
      chainFromId = await DataServer.getChainInfo(31337);
      expect(JSON.stringify(chainFromName)).to.be.equal(JSON.stringify(chainFromId))
    } catch(e){
      console.log(e)
    }
  })

})


