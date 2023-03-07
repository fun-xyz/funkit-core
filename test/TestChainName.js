const { DataServer} = require('../utils/DataServer')
const { TEST_API_KEY } = require("./TestUtils")
const dataServer = new DataServer(TEST_API_KEY);

async function main(){
  await dataServer.init();
  console.log("Testing DataServer.getChainFromName");
  try {
    let chain = await dataServer.getChainFromName("ethereum");
    console.log(chain)
    chain = await dataServer.getChainFromName("avalanche");
    console.log(chain)
    chain = await dataServer.getChainFromName("avalanche-fuji");
    console.log(chain)
    chain = await dataServer.getChainFromName("polygon");
    console.log(chain)
    chain = await dataServer.getChainFromName("polygon-mumbai");
    console.log(chain)
  } catch(e){
    console.log(e)
  }
}

main()

